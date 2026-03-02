// ============================================================================
// EditEngage Database Types
// Auto-generated from Supabase, with app-layer type aliases appended
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean
          project_id: string
          provider: Database["public"]["Enums"]["api_provider"]
          updated_at: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          project_id: string
          provider: Database["public"]["Enums"]["api_provider"]
          updated_at?: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          project_id?: string
          provider?: Database["public"]["Enums"]["api_provider"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          body: Json | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string
          destination_config: Json | null
          destination_type:
            | Database["public"]["Enums"]["destination_type"]
            | null
          id: string
          meta_description: string | null
          pipeline_run_id: string | null
          project_id: string
          published_at: string | null
          published_url: string | null
          status: Database["public"]["Enums"]["content_status"]
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          body?: Json | null
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          destination_config?: Json | null
          destination_type?:
            | Database["public"]["Enums"]["destination_type"]
            | null
          id?: string
          meta_description?: string | null
          pipeline_run_id?: string | null
          project_id: string
          published_at?: string | null
          published_url?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          body?: Json | null
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          destination_config?: Json | null
          destination_type?:
            | Database["public"]["Enums"]["destination_type"]
            | null
          id?: string
          meta_description?: string | null
          pipeline_run_id?: string | null
          project_id?: string
          published_at?: string | null
          published_url?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_pipeline_run_id_fkey"
            columns: ["pipeline_run_id"]
            isOneToOne: false
            referencedRelation: "pipeline_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          project_id: string
          type: Database["public"]["Enums"]["destination_type"]
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          project_id: string
          type: Database["public"]["Enums"]["destination_type"]
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          project_id?: string
          type?: Database["public"]["Enums"]["destination_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "destinations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          description: string
          event_type: string
          id: string
          is_read: boolean
          metadata: Json
          project_id: string
        }
        Insert: {
          created_at?: string
          description: string
          event_type: string
          id?: string
          is_read?: boolean
          metadata?: Json
          project_id: string
        }
        Update: {
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          is_read?: boolean
          metadata?: Json
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_pages: {
        Row: {
          created_at: string
          enriched_content: Json | null
          id: string
          published_url: string | null
          seo_score: number | null
          slug: string
          status: Database["public"]["Enums"]["generated_page_status"]
          template_id: string
          updated_at: string
          variables: Json
        }
        Insert: {
          created_at?: string
          enriched_content?: Json | null
          id?: string
          published_url?: string | null
          seo_score?: number | null
          slug: string
          status?: Database["public"]["Enums"]["generated_page_status"]
          template_id: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          created_at?: string
          enriched_content?: Json | null
          id?: string
          published_url?: string | null
          seo_score?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["generated_page_status"]
          template_id?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "generated_pages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          is_read: boolean
          message: string
          project_id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          is_read?: boolean
          message: string
          project_id: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          is_read?: boolean
          message?: string
          project_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["org_member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["org_member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          settings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      pipeline_runs: {
        Row: {
          bullmq_job_id: string | null
          completed_at: string | null
          created_at: string
          current_agent: string | null
          current_step: number
          error: string | null
          id: string
          pipeline_id: string
          result: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["pipeline_run_status"]
          total_steps: number
        }
        Insert: {
          bullmq_job_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_agent?: string | null
          current_step?: number
          error?: string | null
          id?: string
          pipeline_id: string
          result?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["pipeline_run_status"]
          total_steps?: number
        }
        Update: {
          bullmq_job_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_agent?: string | null
          current_step?: number
          error?: string | null
          id?: string
          pipeline_id?: string
          result?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["pipeline_run_status"]
          total_steps?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_runs_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          project_id: string
          review_mode: Database["public"]["Enums"]["pipeline_review_mode"]
          schedule: string | null
          steps: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          project_id: string
          review_mode?: Database["public"]["Enums"]["pipeline_review_mode"]
          schedule?: string | null
          steps?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          project_id?: string
          review_mode?: Database["public"]["Enums"]["pipeline_review_mode"]
          schedule?: string | null
          steps?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          domain: string | null
          icon: string | null
          id: string
          name: string
          org_id: string
          settings: Json
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          domain?: string | null
          icon?: string | null
          id?: string
          name: string
          org_id: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          domain?: string | null
          icon?: string | null
          id?: string
          name?: string
          org_id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      research_briefs: {
        Row: {
          created_at: string
          findings: Json
          id: string
          query_id: string
          summary: string | null
        }
        Insert: {
          created_at?: string
          findings?: Json
          id?: string
          query_id: string
          summary?: string | null
        }
        Update: {
          created_at?: string
          findings?: Json
          id?: string
          query_id?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_briefs_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "research_queries"
            referencedColumns: ["id"]
          },
        ]
      }
      research_queries: {
        Row: {
          auto_generate_topics: boolean
          brief_count: number
          created_at: string
          id: string
          last_run_at: string | null
          name: string
          pipeline_id: string | null
          project_id: string
          prompt_template: string | null
          provider_chain: Json
          schedule: string | null
          status: Database["public"]["Enums"]["research_query_status"]
          synthesis_mode: Database["public"]["Enums"]["synthesis_mode"]
          updated_at: string
        }
        Insert: {
          auto_generate_topics?: boolean
          brief_count?: number
          created_at?: string
          id?: string
          last_run_at?: string | null
          name: string
          pipeline_id?: string | null
          project_id: string
          prompt_template?: string | null
          provider_chain?: Json
          schedule?: string | null
          status?: Database["public"]["Enums"]["research_query_status"]
          synthesis_mode?: Database["public"]["Enums"]["synthesis_mode"]
          updated_at?: string
        }
        Update: {
          auto_generate_topics?: boolean
          brief_count?: number
          created_at?: string
          id?: string
          last_run_at?: string | null
          name?: string
          pipeline_id?: string | null
          project_id?: string
          prompt_template?: string | null
          provider_chain?: Json
          schedule?: string | null
          status?: Database["public"]["Enums"]["research_query_status"]
          synthesis_mode?: Database["public"]["Enums"]["synthesis_mode"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_queries_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_queries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          created_at: string
          data_source_config: Json
          data_source_type: Database["public"]["Enums"]["template_data_source_type"]
          id: string
          layout: string | null
          name: string
          project_id: string
          sections: Json
          seo_config: Json
          slug_pattern: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_source_config?: Json
          data_source_type?: Database["public"]["Enums"]["template_data_source_type"]
          id?: string
          layout?: string | null
          name: string
          project_id: string
          sections?: Json
          seo_config?: Json
          slug_pattern: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_source_config?: Json
          data_source_type?: Database["public"]["Enums"]["template_data_source_type"]
          id?: string
          layout?: string | null
          name?: string
          project_id?: string
          sections?: Json
          seo_config?: Json
          slug_pattern?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_queue: {
        Row: {
          completed_at: string | null
          content_id: string | null
          created_at: string
          id: string
          keywords: string[]
          notes: string | null
          pipeline_id: string | null
          project_id: string
          seo_score: number | null
          status: Database["public"]["Enums"]["topic_status"]
          title: string
        }
        Insert: {
          completed_at?: string | null
          content_id?: string | null
          created_at?: string
          id?: string
          keywords?: string[]
          notes?: string | null
          pipeline_id?: string | null
          project_id: string
          seo_score?: number | null
          status?: Database["public"]["Enums"]["topic_status"]
          title: string
        }
        Update: {
          completed_at?: string | null
          content_id?: string | null
          created_at?: string
          id?: string
          keywords?: string[]
          notes?: string | null
          pipeline_id?: string | null
          project_id?: string
          seo_score?: number | null
          status?: Database["public"]["Enums"]["topic_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_queue_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_queue_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_queue_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          default_project: string | null
          favorite_projects: string[]
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_project?: string | null
          favorite_projects?: string[]
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_project?: string | null
          favorite_projects?: string[]
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      variety_memory: {
        Row: {
          canonical_line: string
          content_id: string | null
          created_at: string
          id: string
          project_id: string
        }
        Insert: {
          canonical_line: string
          content_id?: string | null
          created_at?: string
          id?: string
          project_id: string
        }
        Update: {
          canonical_line?: string
          content_id?: string | null
          created_at?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variety_memory_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variety_memory_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      writing_agents: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          model: string
          name: string
          project_id: string
          system_prompt: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          model: string
          name: string
          project_id: string
          system_prompt?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          model?: string
          name?: string
          project_id?: string
          system_prompt?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "writing_agents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      writing_styles: {
        Row: {
          avoid_phrases: string[]
          created_at: string
          example_content: string | null
          id: string
          name: string
          project_id: string
          tone: string | null
          updated_at: string
          voice_guidelines: string | null
        }
        Insert: {
          avoid_phrases?: string[]
          created_at?: string
          example_content?: string | null
          id?: string
          name: string
          project_id: string
          tone?: string | null
          updated_at?: string
          voice_guidelines?: string | null
        }
        Update: {
          avoid_phrases?: string[]
          created_at?: string
          example_content?: string | null
          id?: string
          name?: string
          project_id?: string
          tone?: string | null
          updated_at?: string
          voice_guidelines?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "writing_styles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_admin_project_ids: { Args: never; Returns: string[] }
      get_user_org_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      api_provider:
        | "openrouter"
        | "perplexity"
        | "tavily"
        | "openai"
        | "serpapi"
      app_role: "admin" | "moderator" | "user"
      content_status:
        | "draft"
        | "in_review"
        | "approved"
        | "published"
        | "rejected"
      content_type: "article" | "landing_page" | "social_post"
      destination_type: "ghost" | "postbridge" | "webhook"
      generated_page_status: "draft" | "published" | "archived"
      org_member_role: "owner" | "admin" | "member"
      pipeline_review_mode: "auto_publish" | "draft_for_review"
      pipeline_run_status: "queued" | "running" | "completed" | "failed"
      research_provider:
        | "perplexity"
        | "tavily"
        | "openai"
        | "serper"
        | "exa"
        | "brave"
        | "openrouter"
      research_provider_role: "discovery" | "analysis" | "citation"
      research_query_status: "active" | "running" | "idle" | "error"
      synthesis_mode: "unified" | "per_provider" | "comparative"
      template_data_source_type: "csv" | "json" | "supabase_query" | "manual"
      topic_status: "pending" | "in_progress" | "completed" | "skipped"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

// ============================================================================
// App-layer type aliases (preserves existing imports across codebase)
// ============================================================================

// Enum type aliases — re-exported from Database["public"]["Enums"]
export type OrgMemberRole = Database['public']['Enums']['org_member_role'];
export type DestinationType = Database['public']['Enums']['destination_type'];
export type PipelineReviewMode = Database['public']['Enums']['pipeline_review_mode'];
export type PipelineRunStatus = Database['public']['Enums']['pipeline_run_status'];
export type ContentType = Database['public']['Enums']['content_type'];
export type ContentStatus = Database['public']['Enums']['content_status'];
export type TopicStatus = Database['public']['Enums']['topic_status'];
export type TemplateDataSourceType = Database['public']['Enums']['template_data_source_type'];
export type GeneratedPageStatus = Database['public']['Enums']['generated_page_status'];
export type ApiProvider = Database['public']['Enums']['api_provider'];
export type ResearchProvider = Database['public']['Enums']['research_provider'];
export type ResearchProviderRole = Database['public']['Enums']['research_provider_role'];
export type ResearchQueryStatus = Database['public']['Enums']['research_query_status'];
export type SynthesisMode = Database['public']['Enums']['synthesis_mode'];

// Workflow aliases — app-layer names for DB 'pipelines' tables
// Note: DB table is 'pipelines' but app-layer uses 'workflows'
export type WorkflowReviewMode = PipelineReviewMode;
export type WorkflowRunStatus = PipelineRunStatus;
export type Workflow = Database['public']['Tables']['pipelines']['Row'];
export type WorkflowRun = Database['public']['Tables']['pipeline_runs']['Row'];
