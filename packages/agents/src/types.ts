export enum AgentType {
  TOPIC_QUEUE = 'topic_queue',
  VARIETY_ENGINE = 'variety_engine',
  SEO_WRITER = 'seo_writer',
  GHOST_PUBLISHER = 'ghost_publisher',
  POSTBRIDGE_PUBLISHER = 'postbridge_publisher',
  EMAIL_PUBLISHER = 'email_publisher',
  CONTENT_REVIEWER = 'content_reviewer',
  RESEARCH_AGENT = 'research_agent',
  PROGRAMMATIC_PAGE = 'programmatic_page'
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface AgentConfig {
  [key: string]: unknown;
}

export interface Agent<TInput = unknown, TOutput = unknown> {
  type: AgentType;
  execute(input: TInput, config?: AgentConfig): Promise<TOutput>;
  validate(config: AgentConfig): ValidationResult;
}

export interface TopicRow {
  id: string;
  project_id: string;
  pipeline_id: string | null;
  title: string;
  keywords: string[];
  seo_score: number | null;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  notes: string | null;
  completed_at: string | null;
  content_id: string | null;
  created_at: string;
}

export interface SupabaseQueryBuilder {
  select: (columns?: string) => SupabaseQueryBuilder;
  insert: (data: Record<string, unknown> | Record<string, unknown>[]) => SupabaseQueryBuilder;
  update: (data: Record<string, unknown>) => SupabaseQueryBuilder;
  delete: () => SupabaseQueryBuilder;
  eq: (column: string, value: unknown) => SupabaseQueryBuilder;
  in: (column: string, values: unknown[]) => SupabaseQueryBuilder;
  neq: (column: string, value: unknown) => SupabaseQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => SupabaseQueryBuilder;
  limit: (count: number) => SupabaseQueryBuilder;
  single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
  then: (resolve: (value: { data: unknown; error: unknown }) => void) => void;
}

export interface AgentSupabaseClient {
  from: (table: string) => SupabaseQueryBuilder;
  auth: {
    getUser: (token?: string) => Promise<{ data: { user: { id: string } | null }; error: { message: string } | null }>;
  };
}
