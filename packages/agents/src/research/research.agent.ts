import { AgentType, type Agent, type AgentConfig, type ValidationResult } from '../types.js';

export interface Citation {
  url: string;
  title: string;
  snippet: string;
  provider: string;
  date?: string | null;
  relevance_score?: number | null;
}

export interface ProviderResult {
  results: Citation[];
}

export interface ResearchProvider {
  name: string;
  query(query: string): Promise<ProviderResult>;
}

export interface ResearchInput {
  query: string;
  synthesize: boolean;
}

export type ResearchOutputType = 'topic_candidate' | 'source_document' | 'competitive_signal' | 'data_point';

export interface ResearchBrief {
  query: string;
  citations: Citation[];
  brief: string | null;
  warnings: string[];
  outputType: ResearchOutputType;
}

type SynthesizerFn = (query: string, citations: Citation[]) => Promise<string>;

interface ResearchAgentDeps {
  providers: ResearchProvider[];
  synthesizer: SynthesizerFn;
}

export class ResearchAgent implements Agent<ResearchInput, ResearchBrief> {
  type = AgentType.RESEARCH_AGENT;

  private providers: ResearchProvider[];
  private synthesizer: SynthesizerFn;

  constructor(deps: ResearchAgentDeps) {
    this.providers = deps.providers;
    this.synthesizer = deps.synthesizer;
  }

  async execute(input: ResearchInput): Promise<ResearchBrief> {
    const warnings: string[] = [];
    const allCitations: Citation[] = [];

    const results = await Promise.allSettled(
      this.providers.map((provider) => provider.query(input.query))
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const provider = this.providers[i];
      if (result.status === 'fulfilled') {
        allCitations.push(...result.value.results);
      } else {
        warnings.push(`Provider ${provider.name} unavailable: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
      }
    }

    let brief: string | null = null;
    if (input.synthesize) {
      brief = await this.synthesizer(input.query, allCitations);
    }

    // Research brief is returned as output; the orchestrator handles persistence
    return {
      query: input.query,
      citations: allCitations,
      brief,
      warnings,
      outputType: 'source_document'
    };
  }

  validate(config: AgentConfig): ValidationResult {
    const errors: string[] = [];
    if (!Array.isArray(config.providers) || config.providers.length === 0) {
      errors.push('providers is required and must be a non-empty array');
    }
    return errors.length > 0 ? { valid: false, errors } : { valid: true };
  }
}
