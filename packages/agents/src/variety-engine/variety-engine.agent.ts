import { AgentType, type Agent, type AgentConfig, type ValidationResult, type TopicRow } from '../types.js';
import { canonicalize } from './canonicalizer.js';
import { checkNovelty, NoveltyResult } from './novelty-checker.js';
import { mutate } from './mutator.js';
import { generateHints, type VarietyHints } from './hooks.js';

export { type VarietyHints } from './hooks.js';

export interface VarietyEngineInput {
  topic: TopicRow;
  projectId: string;
}

export interface VarietyEngineOutput {
  canonical: string;
  isNovel: boolean;
  hints: VarietyHints;
}

interface SupabaseClient {
  from(table: string): {
    select(columns?: string): {
      eq(column: string, value: string): Promise<{
        data: Array<{ canonical_line: string }> | null;
        error: { message: string } | null;
      }>;
    };
    insert(values: Record<string, unknown>): {
      select(): Promise<{ error: { message: string } | null }>;
    };
  };
}

export class VarietyEngineAgent implements Agent<VarietyEngineInput, VarietyEngineOutput> {
  type = AgentType.VARIETY_ENGINE;

  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async execute(input: VarietyEngineInput): Promise<VarietyEngineOutput> {
    // Fetch existing memory
    const { data: memoryRows } = await this.supabase
      .from('variety_memory')
      .select('canonical_line')
      .eq('project_id', input.projectId);

    const memory = (memoryRows ?? []).map(row => row.canonical_line);

    // Canonicalize the topic
    let canonical = canonicalize(input.topic.title);

    // Check novelty
    let noveltyResult = checkNovelty(canonical, memory);
    let isNovel = noveltyResult === NoveltyResult.NOVEL;

    // If not novel, try to mutate
    if (!isNovel) {
      const mutation = mutate(canonical, memory);
      canonical = mutation.canonical;
      isNovel = mutation.isNovel;
    }

    // Generate hints
    const hints = generateHints(canonical, memory);

    // Store canonical in memory
    await this.supabase
      .from('variety_memory')
      .insert({
        project_id: input.projectId,
        canonical_line: canonical
      })
      .select();

    return { canonical, isNovel, hints };
  }

  validate(config: AgentConfig): ValidationResult {
    const errors: string[] = [];
    if (!config.projectId) {
      errors.push('projectId is required');
    }
    return errors.length > 0 ? { valid: false, errors } : { valid: true };
  }
}
