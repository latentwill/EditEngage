import Logfire from '@pydantic/logfire-node';
import { AgentType, type Agent, type AgentConfig, type ValidationResult, type TopicRow } from '../types.js';
import type { VarietyHints } from '../variety-engine/hooks.js';
import { performSerpResearch, type SerpAnalysis } from './serp-research.js';
import { injectTraceHeaders } from '../research/providers/traceparent.js';

export interface SeoWriterInput {
  topic: TopicRow;
  canonical: string;
  hints: VarietyHints;
}

export interface SeoWriterOutput {
  title: string;
  body: string;
  metaDescription: string;
  tags: string[];
  seoScore: number;
  suggestedTopics: string[];
}

export interface SeoWriterConfig extends AgentConfig {
  writingStyleId: string;
  serpResearch: boolean;
  serpApiKey?: string;
}

interface WritingStyle {
  id: string;
  name: string;
  tone: string;
  avoid_phrases: string[];
  voice_guidelines: string;
  structural_template?: string | null;
  vocabulary_level?: string | null;
  point_of_view?: string | null;
  anti_patterns?: string[] | null;
}

type FetchFn = (url: string, init?: RequestInit) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

interface SupabaseClient {
  from(table: string): {
    select(columns?: string): {
      eq(column: string, value: string): {
        single(): Promise<{ data: WritingStyle | null; error: { message: string } | null }>;
      };
    };
  };
}

const DEFAULT_MODEL = 'anthropic/claude-sonnet-4';

export class SeoWriterAgent implements Agent<SeoWriterInput, SeoWriterOutput> {
  type = AgentType.SEO_WRITER;

  private supabase: SupabaseClient;
  private fetchFn: FetchFn;

  constructor(supabase: SupabaseClient, fetchFn: FetchFn) {
    this.supabase = supabase;
    this.fetchFn = fetchFn;
  }

  async execute(
    input: SeoWriterInput,
    config?: SeoWriterConfig
  ): Promise<SeoWriterOutput> {
    const cfg: SeoWriterConfig = config ?? {
      writingStyleId: '',
      serpResearch: false
    };

    // Fetch writing style
    const { data: writingStyle } = await this.supabase
      .from('writing_styles')
      .select('*')
      .eq('id', cfg.writingStyleId)
      .single();

    // Perform SERP research if enabled
    let serpAnalysis: SerpAnalysis | null = null;
    if (cfg.serpResearch && cfg.serpApiKey) {
      serpAnalysis = await performSerpResearch(
        input.topic.title,
        cfg.serpApiKey,
        this.fetchFn
      );
    }

    // Build prompt
    const prompt = this.buildPrompt(input, writingStyle, serpAnalysis);

    const data = await Logfire.span('llm.call', {
      attributes: {
        'llm.provider': 'openrouter',
        'llm.model': DEFAULT_MODEL,
        'llm.prompt_length': prompt.length,
        'seo_writer.writing_style_id': cfg.writingStyleId,
      },
      callback: async (span) => {
        const llmServiceUrl = process.env.LLM_SERVICE_URL ?? 'http://llm-service:8000';
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        const response = await this.fetchFn(`${llmServiceUrl}/v1/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: DEFAULT_MODEL,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        span.setAttributes({ 'llm.response_status': response.ok ? 'ok' : 'error' });

        return await response.json() as {
          choices: Array<{ message: { content: string } }>;
        };
      },
    });

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('No response from LLM');
    }

    let rawContent = data.choices[0].message.content;
    rawContent = rawContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    let content: SeoWriterOutput;
    try {
      content = JSON.parse(rawContent) as SeoWriterOutput;
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : String(cause);
      throw new Error(`Failed to parse LLM response as JSON: ${reason}`);
    }

    return {
      title: content.title,
      body: content.body,
      metaDescription: content.metaDescription,
      tags: content.tags,
      seoScore: content.seoScore,
      suggestedTopics: content.suggestedTopics
    };
  }

  private buildPrompt(
    input: SeoWriterInput,
    writingStyle: WritingStyle | null,
    serpAnalysis: SerpAnalysis | null
  ): string {
    const parts: string[] = [];

    parts.push(`Write an SEO-optimized article about: ${input.topic.title}`);
    parts.push(`Keywords: ${input.topic.keywords.join(', ')}`);
    parts.push(`Structure: ${input.hints.structureHint}`);
    parts.push(`Example context: ${input.hints.exampleSeed}`);

    if (writingStyle) {
      parts.push(`Tone: ${writingStyle.tone}`);
      parts.push(`Guidelines: ${writingStyle.voice_guidelines}`);
      if (writingStyle.avoid_phrases.length > 0) {
        parts.push(`AVOID these phrases: ${writingStyle.avoid_phrases.join(', ')}`);
      }
      if (writingStyle.structural_template) {
        parts.push(`Structural Template: ${writingStyle.structural_template}`);
      }
      if (writingStyle.vocabulary_level) {
        parts.push(`Vocabulary: ${writingStyle.vocabulary_level}`);
      }
      if (writingStyle.point_of_view) {
        parts.push(`Point of View: ${writingStyle.point_of_view}`);
      }
      if (writingStyle.anti_patterns && writingStyle.anti_patterns.length > 0) {
        parts.push(`Anti-patterns: ${writingStyle.anti_patterns.join(', ')}`);
      }
    }

    if (input.hints.avoidList.length > 0) {
      parts.push(`Avoid covering these angles: ${input.hints.avoidList.join(', ')}`);
    }

    if (serpAnalysis) {
      parts.push(`Target word count: ${serpAnalysis.targetWordCount} words (15% above SERP average of ${serpAnalysis.averageWordCount})`);
    }

    parts.push('Respond with JSON: { title, body (HTML), metaDescription, tags, seoScore, suggestedTopics (5 new related topics) }');

    return parts.join('\n');
  }

  validate(config: AgentConfig): ValidationResult {
    const errors: string[] = [];

    if (!config.writingStyleId) {
      errors.push('writingStyleId is required');
    }

    return errors.length > 0
      ? { valid: false, errors }
      : { valid: true };
  }
}
