import { AgentType, type Agent, type AgentConfig, type ValidationResult, type TopicRow } from '../types.js';

export type { TopicRow } from '../types.js';

export interface TopicQueueInput {
  projectId: string;
}

export interface TopicQueueOutput {
  topic: TopicRow;
  keywords: string[];
}

export interface TopicQueueConfig extends AgentConfig {
  projectId: string;
  strategy: 'highest_seo_score' | 'fifo';
}

interface SupabaseClient {
  from(table: string): {
    select(columns?: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          order(column: string, options: { ascending: boolean }): {
            limit(count: number): Promise<{ data: TopicRow[] | null; error: { message: string } | null }>;
          };
        };
      };
    };
    update(values: Record<string, unknown>): {
      eq(column: string, value: string): {
        eq(column: string, value: string): Promise<{ error: { message: string } | null }>;
      };
    };
  };
}

const VALID_STRATEGIES = ['highest_seo_score', 'fifo'] as const;

export class TopicQueueAgent implements Agent<TopicQueueInput, TopicQueueOutput> {
  type = AgentType.TOPIC_QUEUE;

  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async execute(
    input: TopicQueueInput,
    config?: TopicQueueConfig
  ): Promise<TopicQueueOutput> {
    const strategy = config?.strategy ?? 'highest_seo_score';
    const orderColumn = strategy === 'fifo' ? 'created_at' : 'seo_score';
    const ascending = strategy === 'fifo';

    const { data, error } = await this.supabase
      .from('topic_queue')
      .select('*')
      .eq('project_id', input.projectId)
      .eq('status', 'pending')
      .order(orderColumn, { ascending })
      .limit(1);

    if (error) {
      throw new Error(`Failed to fetch topics: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error(`No pending topics found for project ${input.projectId}`);
    }

    const topic = data[0];

    await this.supabase
      .from('topic_queue')
      .update({ status: 'in_progress' })
      .eq('id', topic.id)
      .eq('project_id', input.projectId);

    return {
      topic,
      keywords: topic.keywords
    };
  }

  validate(config: AgentConfig): ValidationResult {
    const errors: string[] = [];
    const strategy = config.strategy as string | undefined;
    if (!strategy || !VALID_STRATEGIES.includes(strategy as typeof VALID_STRATEGIES[number])) {
      errors.push('strategy must be "highest_seo_score" or "fifo"');
    }
    return errors.length > 0 ? { valid: false, errors } : { valid: true };
  }
}
