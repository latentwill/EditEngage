import { AgentType, type Agent, type AgentConfig, type ValidationResult, type TopicRow } from '../types.js';
import type { VarietyHints } from '../variety-engine/hooks.js';
import { performSerpResearch, type SerpAnalysis } from './serp-research.js';

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
  openrouterApiKey: string;
  serpApiKey?: string;
}

interface WritingStyle {
  id: string;
  name: string;
  tone: string;
  avoid_phrases: string[];
  guidelines: string;
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
    const cfg = config ?? { writingStyleId: '', serpResearch: false, openrouterApiKey: '' };

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

    // Call OpenRouter
    const response = await this.fetchFn('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.openrouterApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('No response from LLM');
    }

    let content: SeoWriterOutput;
    try {
      content = JSON.parse(data.choices[0].message.content) as SeoWriterOutput;
    } catch (parseError) {
      throw new Error(`Failed to parse LLM response as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
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
      parts.push(`Guidelines: ${writingStyle.guidelines}`);
      if (writingStyle.avoid_phrases.length > 0) {
        parts.push(`AVOID these phrases: ${writingStyle.avoid_phrases.join(', ')}`);
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
    if (!config.openrouterApiKey) {
      errors.push('openrouterApiKey is required');
    }

    return errors.length > 0
      ? { valid: false, errors }
      : { valid: true };
  }
}
