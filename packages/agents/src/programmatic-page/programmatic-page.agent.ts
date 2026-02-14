import { AgentType, type Agent, type AgentConfig, type ValidationResult } from '../types.js';

export class ProgrammaticPageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProgrammaticPageError';
  }
}

export interface TemplateConfig {
  name: string;
  slug_pattern: string;
  body_template: string;
  variables: string[];
}

export interface PageResult {
  slug: string;
  title: string;
  html: string;
  enrichmentContent?: string;
  ghostPostId?: string;
  url?: string;
}

export interface ProgrammaticPageInput {
  template: TemplateConfig;
  dataRows: Record<string, string>[];
  enrichmentEnabled?: boolean;
  publish?: boolean;
  onProgress?: (progress: ProgressReport) => void;
}

export interface ProgressReport {
  processed: number;
  total: number;
  currentChunk: number;
}

export interface ProgrammaticPageOutput {
  pages: PageResult[];
}

type LlmFn = (prompt: string) => Promise<string>;

interface GhostPublisher {
  publish(page: { slug: string; title: string; html: string; status: string }): Promise<{
    ghostPostId: string;
    slug: string;
    url: string;
  }>;
  updateStatus(ghostPostId: string, status: string): Promise<{ ghostPostId: string; status: string }>;
  getSlugs(): Promise<string[]>;
}

const CHUNK_SIZE = 50;

function substituteVariables(template: string, row: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(row)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

function extractTitle(html: string): string {
  const match = html.match(/<h1>(.*?)<\/h1>/);
  return match ? match[1] : '';
}

export class ProgrammaticPageAgent implements Agent<ProgrammaticPageInput, ProgrammaticPageOutput> {
  type = AgentType.PROGRAMMATIC_PAGE;

  private llmFn: LlmFn;
  private publisher: GhostPublisher;

  constructor(llmFn: LlmFn, publisher: GhostPublisher) {
    this.llmFn = llmFn;
    this.publisher = publisher;
  }

  async execute(input: ProgrammaticPageInput): Promise<ProgrammaticPageOutput> {
    const { template, dataRows, enrichmentEnabled, publish, onProgress } = input;
    const allPages: PageResult[] = [];
    const usedSlugs = new Set<string>();
    const totalRows = dataRows.length;
    const totalChunks = Math.ceil(totalRows / CHUNK_SIZE);

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalRows);
      const chunk = dataRows.slice(start, end);

      for (const row of chunk) {
        let html = substituteVariables(template.body_template, row);
        let slug = substituteVariables(template.slug_pattern, row);
        let enrichmentContent: string | undefined;

        if (enrichmentEnabled) {
          const prompt = `Generate unique enrichment content for a page about: ${extractTitle(html)}`;
          enrichmentContent = await this.llmFn(prompt);
          html = html.replace('{enrichment}', enrichmentContent);
        }

        // Handle slug collisions
        const baseSlug = slug;
        let counter = 2;
        while (usedSlugs.has(slug)) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
        usedSlugs.add(slug);

        const title = extractTitle(html);

        const page: PageResult = {
          slug,
          title,
          html,
          enrichmentContent
        };

        if (publish) {
          const result = await this.publisher.publish({
            slug,
            title,
            html,
            status: 'published'
          });
          page.ghostPostId = result.ghostPostId;
          page.url = result.url;
        }

        allPages.push(page);
      }

      if (onProgress) {
        onProgress({
          processed: end,
          total: totalRows,
          currentChunk: chunkIndex + 1
        });
      }
    }

    return { pages: allPages };
  }

  async bulkUpdateStatus(ghostPostIds: string[], status: string): Promise<void> {
    for (const id of ghostPostIds) {
      await this.publisher.updateStatus(id, status);
    }
  }

  validate(config: AgentConfig): ValidationResult {
    const errors: string[] = [];

    if (!config.template) {
      errors.push('template is required');
    }
    if (!config.dataRows || !Array.isArray(config.dataRows)) {
      errors.push('dataRows must be an array');
    }

    return errors.length > 0
      ? { valid: false, errors }
      : { valid: true };
  }
}
