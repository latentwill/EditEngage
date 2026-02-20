// ============================================================================
// EditEngage v2 Database Types
// Generated from 001_initial_schema.sql
// ============================================================================

// -- Enum Types ---------------------------------------------------------------

export type OrgMemberRole = 'owner' | 'admin' | 'member';

export type DestinationType = 'ghost' | 'postbridge' | 'webhook';

export type PipelineReviewMode = 'auto_publish' | 'draft_for_review';

export type PipelineRunStatus = 'queued' | 'running' | 'completed' | 'failed';

export type ContentType = 'article' | 'landing_page' | 'social_post';

export type ContentStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'published'
  | 'rejected';

export type TopicStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export type TemplateDataSourceType =
  | 'csv'
  | 'json'
  | 'supabase_query'
  | 'manual';

export type GeneratedPageStatus = 'draft' | 'published' | 'archived';

export type ApiProvider = 'openrouter' | 'perplexity' | 'tavily' | 'openai' | 'serpapi';

// -- Database Type ------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          settings: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          settings?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          settings?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
      };
      organization_members: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          role: OrgMemberRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id: string;
          role?: OrgMemberRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string;
          role?: OrgMemberRole;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          description: string | null;
          icon: string | null;
          color: string | null;
          domain: string | null;
          settings: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          color?: string | null;
          domain?: string | null;
          settings?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          description?: string | null;
          icon?: string | null;
          color?: string | null;
          domain?: string | null;
          settings?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
      };
      destinations: {
        Row: {
          id: string;
          project_id: string;
          type: DestinationType;
          name: string;
          config: Record<string, unknown>;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          type: DestinationType;
          name: string;
          config?: Record<string, unknown>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          type?: DestinationType;
          name?: string;
          config?: Record<string, unknown>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      writing_styles: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          tone: string | null;
          voice_guidelines: string | null;
          avoid_phrases: string[];
          example_content: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          tone?: string | null;
          voice_guidelines?: string | null;
          avoid_phrases?: string[];
          example_content?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          tone?: string | null;
          voice_guidelines?: string | null;
          avoid_phrases?: string[];
          example_content?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      pipelines: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          description: string | null;
          schedule: string | null;
          review_mode: PipelineReviewMode;
          is_active: boolean;
          steps: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          description?: string | null;
          schedule?: string | null;
          review_mode?: PipelineReviewMode;
          is_active?: boolean;
          steps?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          description?: string | null;
          schedule?: string | null;
          review_mode?: PipelineReviewMode;
          is_active?: boolean;
          steps?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
      };
      pipeline_runs: {
        Row: {
          id: string;
          pipeline_id: string;
          status: PipelineRunStatus;
          current_step: number;
          total_steps: number;
          current_agent: string | null;
          started_at: string | null;
          completed_at: string | null;
          result: Record<string, unknown> | null;
          error: string | null;
          bullmq_job_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pipeline_id: string;
          status?: PipelineRunStatus;
          current_step?: number;
          total_steps?: number;
          current_agent?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          result?: Record<string, unknown> | null;
          error?: string | null;
          bullmq_job_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          pipeline_id?: string;
          status?: PipelineRunStatus;
          current_step?: number;
          total_steps?: number;
          current_agent?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          result?: Record<string, unknown> | null;
          error?: string | null;
          bullmq_job_id?: string | null;
          created_at?: string;
        };
      };
      content: {
        Row: {
          id: string;
          project_id: string;
          pipeline_run_id: string | null;
          title: string;
          body: Record<string, unknown> | null;
          meta_description: string | null;
          tags: string[];
          content_type: ContentType;
          status: ContentStatus;
          published_at: string | null;
          published_url: string | null;
          destination_type: DestinationType | null;
          destination_config: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          pipeline_run_id?: string | null;
          title: string;
          body?: Record<string, unknown> | null;
          meta_description?: string | null;
          tags?: string[];
          content_type?: ContentType;
          status?: ContentStatus;
          published_at?: string | null;
          published_url?: string | null;
          destination_type?: DestinationType | null;
          destination_config?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          pipeline_run_id?: string | null;
          title?: string;
          body?: Record<string, unknown> | null;
          meta_description?: string | null;
          tags?: string[];
          content_type?: ContentType;
          status?: ContentStatus;
          published_at?: string | null;
          published_url?: string | null;
          destination_type?: DestinationType | null;
          destination_config?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      topic_queue: {
        Row: {
          id: string;
          project_id: string;
          pipeline_id: string | null;
          title: string;
          keywords: string[];
          seo_score: number | null;
          status: TopicStatus;
          notes: string | null;
          completed_at: string | null;
          content_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          pipeline_id?: string | null;
          title: string;
          keywords?: string[];
          seo_score?: number | null;
          status?: TopicStatus;
          notes?: string | null;
          completed_at?: string | null;
          content_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          pipeline_id?: string | null;
          title?: string;
          keywords?: string[];
          seo_score?: number | null;
          status?: TopicStatus;
          notes?: string | null;
          completed_at?: string | null;
          content_id?: string | null;
          created_at?: string;
        };
      };
      variety_memory: {
        Row: {
          id: string;
          project_id: string;
          canonical_line: string;
          content_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          canonical_line: string;
          content_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          canonical_line?: string;
          content_id?: string | null;
          created_at?: string;
        };
      };
      templates: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          slug_pattern: string;
          layout: string | null;
          sections: Record<string, unknown>;
          seo_config: Record<string, unknown>;
          data_source_type: TemplateDataSourceType;
          data_source_config: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          slug_pattern: string;
          layout?: string | null;
          sections?: Record<string, unknown>;
          seo_config?: Record<string, unknown>;
          data_source_type?: TemplateDataSourceType;
          data_source_config?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          slug_pattern?: string;
          layout?: string | null;
          sections?: Record<string, unknown>;
          seo_config?: Record<string, unknown>;
          data_source_type?: TemplateDataSourceType;
          data_source_config?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
      };
      generated_pages: {
        Row: {
          id: string;
          template_id: string;
          variables: Record<string, unknown>;
          enriched_content: Record<string, unknown> | null;
          slug: string;
          published_url: string | null;
          status: GeneratedPageStatus;
          seo_score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          variables?: Record<string, unknown>;
          enriched_content?: Record<string, unknown> | null;
          slug: string;
          published_url?: string | null;
          status?: GeneratedPageStatus;
          seo_score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          variables?: Record<string, unknown>;
          enriched_content?: Record<string, unknown> | null;
          slug?: string;
          published_url?: string | null;
          status?: GeneratedPageStatus;
          seo_score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          project_id: string;
          event_type: string;
          description: string;
          metadata: Record<string, unknown>;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          event_type: string;
          description: string;
          metadata?: Record<string, unknown>;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          event_type?: string;
          description?: string;
          metadata?: Record<string, unknown>;
          is_read?: boolean;
          created_at?: string;
        };
      };
      writing_agents: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          description: string | null;
          model: string;
          system_prompt: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          description?: string | null;
          model?: string;
          system_prompt?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          description?: string | null;
          model?: string;
          system_prompt?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      api_keys: {
        Row: {
          id: string;
          project_id: string;
          provider: ApiProvider;
          api_key: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          provider: ApiProvider;
          api_key: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          provider?: ApiProvider;
          api_key?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Note: DB table is 'pipelines' but app-layer uses 'workflows'
      notifications: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          event_id: string | null;
          title: string;
          message: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id: string;
          event_id?: string | null;
          title: string;
          message: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string;
          event_id?: string | null;
          title?: string;
          message?: string;
          is_read?: boolean;
          created_at?: string;
        };
      };
    };
  };
}

// -- Workflow Type Aliases (app-layer names for DB 'pipelines' tables) --------

export type WorkflowReviewMode = PipelineReviewMode;

export type WorkflowRunStatus = PipelineRunStatus;

export type Workflow = Database['public']['Tables']['pipelines']['Row'];

export type WorkflowRun = Database['public']['Tables']['pipeline_runs']['Row'];
