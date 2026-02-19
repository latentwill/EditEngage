/**
 * @behavior Database types define the complete schema for all 15 tables
 * with Row, Insert, and Update variants and all enum types
 * @business_rule Types must match the SQL schema exactly to ensure
 * type-safe database operations throughout the application
 */
import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  Database,
  OrgMemberRole,
  DestinationType,
  PipelineReviewMode,
  PipelineRunStatus,
  ContentType,
  ContentStatus,
  TopicStatus,
  TemplateDataSourceType,
  GeneratedPageStatus,
  ApiProvider,
  WorkflowReviewMode,
  WorkflowRunStatus,
  Workflow,
  WorkflowRun,
} from './database.js';

type Tables = Database['public']['Tables'];

describe('Database types', () => {
  describe('includes all 15 tables', () => {
    const tableNames = [
      'api_keys',
      'organizations',
      'organization_members',
      'projects',
      'destinations',
      'writing_styles',
      'pipelines',
      'pipeline_runs',
      'content',
      'topic_queue',
      'variety_memory',
      'templates',
      'generated_pages',
      'events',
      'notifications',
    ] as const;

    it.each(tableNames)('includes table: %s', (tableName) => {
      // Runtime check that the key exists in the type structure
      // We verify this compiles and assert using a type-level test
      type HasTable = Tables[typeof tableName];
      // If this compiles, the table key exists in Tables
      const assertion: HasTable extends { Row: Record<string, unknown> }
        ? true
        : false = true;
      expect(assertion).toBe(true);
    });
  });

  describe('api_keys table Row has expected columns', () => {
    it('has id, project_id, provider, api_key, is_active, created_at, updated_at', () => {
      type Row = Tables['api_keys']['Row'];
      expectTypeOf<Row>().toHaveProperty('id');
      expectTypeOf<Row>().toHaveProperty('project_id');
      expectTypeOf<Row>().toHaveProperty('provider');
      expectTypeOf<Row>().toHaveProperty('api_key');
      expectTypeOf<Row>().toHaveProperty('is_active');
      expectTypeOf<Row>().toHaveProperty('created_at');
      expectTypeOf<Row>().toHaveProperty('updated_at');
    });
  });

  describe('organizations table Row has expected columns', () => {
    it('has id, name, owner_id, settings, created_at, updated_at', () => {
      type Row = Tables['organizations']['Row'];
      expectTypeOf<Row>().toHaveProperty('id');
      expectTypeOf<Row>().toHaveProperty('name');
      expectTypeOf<Row>().toHaveProperty('owner_id');
      expectTypeOf<Row>().toHaveProperty('settings');
      expectTypeOf<Row>().toHaveProperty('created_at');
      expectTypeOf<Row>().toHaveProperty('updated_at');
    });
  });

  describe('organization_members table Row has expected columns', () => {
    it('has id, org_id, user_id, role, created_at', () => {
      type Row = Tables['organization_members']['Row'];
      expectTypeOf<Row>().toHaveProperty('id');
      expectTypeOf<Row>().toHaveProperty('org_id');
      expectTypeOf<Row>().toHaveProperty('user_id');
      expectTypeOf<Row>().toHaveProperty('role');
      expectTypeOf<Row>().toHaveProperty('created_at');
    });
  });

  describe('projects table Row has expected columns', () => {
    it('has id, org_id, name, description, settings, created_at, updated_at', () => {
      type Row = Tables['projects']['Row'];
      expectTypeOf<Row>().toHaveProperty('id');
      expectTypeOf<Row>().toHaveProperty('org_id');
      expectTypeOf<Row>().toHaveProperty('name');
      expectTypeOf<Row>().toHaveProperty('description');
      expectTypeOf<Row>().toHaveProperty('settings');
      expectTypeOf<Row>().toHaveProperty('created_at');
      expectTypeOf<Row>().toHaveProperty('updated_at');
    });
  });

  describe('destinations table Row has expected columns', () => {
    it('has id, project_id, type, name, config, is_active', () => {
      type Row = Tables['destinations']['Row'];
      expectTypeOf<Row>().toHaveProperty('id');
      expectTypeOf<Row>().toHaveProperty('project_id');
      expectTypeOf<Row>().toHaveProperty('type');
      expectTypeOf<Row>().toHaveProperty('name');
      expectTypeOf<Row>().toHaveProperty('config');
      expectTypeOf<Row>().toHaveProperty('is_active');
    });
  });

  describe('pipelines table Row has expected columns', () => {
    it('has id, project_id, name, schedule, review_mode, is_active, steps', () => {
      type Row = Tables['pipelines']['Row'];
      expectTypeOf<Row>().toHaveProperty('id');
      expectTypeOf<Row>().toHaveProperty('project_id');
      expectTypeOf<Row>().toHaveProperty('name');
      expectTypeOf<Row>().toHaveProperty('schedule');
      expectTypeOf<Row>().toHaveProperty('review_mode');
      expectTypeOf<Row>().toHaveProperty('is_active');
      expectTypeOf<Row>().toHaveProperty('steps');
    });
  });

  describe('pipeline_runs table Row has expected columns', () => {
    it('has id, pipeline_id, status, current_step, total_steps, current_agent', () => {
      type Row = Tables['pipeline_runs']['Row'];
      expectTypeOf<Row>().toHaveProperty('id');
      expectTypeOf<Row>().toHaveProperty('pipeline_id');
      expectTypeOf<Row>().toHaveProperty('status');
      expectTypeOf<Row>().toHaveProperty('current_step');
      expectTypeOf<Row>().toHaveProperty('total_steps');
      expectTypeOf<Row>().toHaveProperty('current_agent');
    });
  });

  describe('content table Row has expected columns', () => {
    it('has id, project_id, title, body, status, content_type, tags', () => {
      type Row = Tables['content']['Row'];
      expectTypeOf<Row>().toHaveProperty('id');
      expectTypeOf<Row>().toHaveProperty('project_id');
      expectTypeOf<Row>().toHaveProperty('title');
      expectTypeOf<Row>().toHaveProperty('body');
      expectTypeOf<Row>().toHaveProperty('status');
      expectTypeOf<Row>().toHaveProperty('content_type');
      expectTypeOf<Row>().toHaveProperty('tags');
    });
  });

  describe('topic_queue table Row has expected columns', () => {
    it('has id, project_id, title, keywords, seo_score, status', () => {
      type Row = Tables['topic_queue']['Row'];
      expectTypeOf<Row>().toHaveProperty('id');
      expectTypeOf<Row>().toHaveProperty('project_id');
      expectTypeOf<Row>().toHaveProperty('title');
      expectTypeOf<Row>().toHaveProperty('keywords');
      expectTypeOf<Row>().toHaveProperty('seo_score');
      expectTypeOf<Row>().toHaveProperty('status');
    });
  });

  describe('variety_memory table Row has expected columns', () => {
    it('has id, project_id, canonical_line, content_id, created_at', () => {
      type Row = Tables['variety_memory']['Row'];
      expectTypeOf<Row>().toHaveProperty('id');
      expectTypeOf<Row>().toHaveProperty('project_id');
      expectTypeOf<Row>().toHaveProperty('canonical_line');
      expectTypeOf<Row>().toHaveProperty('content_id');
      expectTypeOf<Row>().toHaveProperty('created_at');
    });
  });

  describe('templates table Row has expected columns', () => {
    it('has id, project_id, name, slug_pattern, sections, data_source_type', () => {
      type Row = Tables['templates']['Row'];
      expectTypeOf<Row>().toHaveProperty('id');
      expectTypeOf<Row>().toHaveProperty('project_id');
      expectTypeOf<Row>().toHaveProperty('name');
      expectTypeOf<Row>().toHaveProperty('slug_pattern');
      expectTypeOf<Row>().toHaveProperty('sections');
      expectTypeOf<Row>().toHaveProperty('data_source_type');
    });
  });

  describe('generated_pages table Row has expected columns', () => {
    it('has id, template_id, variables, slug, status, seo_score', () => {
      type Row = Tables['generated_pages']['Row'];
      expectTypeOf<Row>().toHaveProperty('id');
      expectTypeOf<Row>().toHaveProperty('template_id');
      expectTypeOf<Row>().toHaveProperty('variables');
      expectTypeOf<Row>().toHaveProperty('slug');
      expectTypeOf<Row>().toHaveProperty('status');
      expectTypeOf<Row>().toHaveProperty('seo_score');
    });
  });

  describe('events table Row has expected columns', () => {
    it('has id, project_id, event_type, description, metadata, is_read', () => {
      type Row = Tables['events']['Row'];
      expectTypeOf<Row>().toHaveProperty('id');
      expectTypeOf<Row>().toHaveProperty('project_id');
      expectTypeOf<Row>().toHaveProperty('event_type');
      expectTypeOf<Row>().toHaveProperty('description');
      expectTypeOf<Row>().toHaveProperty('metadata');
      expectTypeOf<Row>().toHaveProperty('is_read');
    });
  });

  describe('notifications table Row has expected columns', () => {
    it('has id, user_id, project_id, event_id, title, message, is_read', () => {
      type Row = Tables['notifications']['Row'];
      expectTypeOf<Row>().toHaveProperty('id');
      expectTypeOf<Row>().toHaveProperty('user_id');
      expectTypeOf<Row>().toHaveProperty('project_id');
      expectTypeOf<Row>().toHaveProperty('event_id');
      expectTypeOf<Row>().toHaveProperty('title');
      expectTypeOf<Row>().toHaveProperty('message');
      expectTypeOf<Row>().toHaveProperty('is_read');
    });
  });

  describe('writing_styles table Row has expected columns', () => {
    it('has id, project_id, name, tone, voice_guidelines, avoid_phrases', () => {
      type Row = Tables['writing_styles']['Row'];
      expectTypeOf<Row>().toHaveProperty('id');
      expectTypeOf<Row>().toHaveProperty('project_id');
      expectTypeOf<Row>().toHaveProperty('name');
      expectTypeOf<Row>().toHaveProperty('tone');
      expectTypeOf<Row>().toHaveProperty('voice_guidelines');
      expectTypeOf<Row>().toHaveProperty('avoid_phrases');
    });
  });

  describe('enum types are correctly defined', () => {
    it('OrgMemberRole is a union of owner | admin | member', () => {
      expectTypeOf<OrgMemberRole>().toEqualTypeOf<'owner' | 'admin' | 'member'>();
    });

    it('DestinationType is a union of ghost | postbridge | webhook', () => {
      expectTypeOf<DestinationType>().toEqualTypeOf<'ghost' | 'postbridge' | 'webhook'>();
    });

    it('PipelineReviewMode is a union of auto_publish | draft_for_review', () => {
      expectTypeOf<PipelineReviewMode>().toEqualTypeOf<'auto_publish' | 'draft_for_review'>();
    });

    it('PipelineRunStatus is a union of queued | running | completed | failed', () => {
      expectTypeOf<PipelineRunStatus>().toEqualTypeOf<'queued' | 'running' | 'completed' | 'failed'>();
    });

    it('ContentType is a union of article | landing_page | social_post', () => {
      expectTypeOf<ContentType>().toEqualTypeOf<'article' | 'landing_page' | 'social_post'>();
    });

    it('ContentStatus is a union of draft | in_review | approved | published | rejected', () => {
      expectTypeOf<ContentStatus>().toEqualTypeOf<'draft' | 'in_review' | 'approved' | 'published' | 'rejected'>();
    });

    it('TopicStatus is a union of pending | in_progress | completed | skipped', () => {
      expectTypeOf<TopicStatus>().toEqualTypeOf<'pending' | 'in_progress' | 'completed' | 'skipped'>();
    });

    it('TemplateDataSourceType is a union of csv | json | supabase_query | manual', () => {
      expectTypeOf<TemplateDataSourceType>().toEqualTypeOf<'csv' | 'json' | 'supabase_query' | 'manual'>();
    });

    it('GeneratedPageStatus is a union of draft | published | archived', () => {
      expectTypeOf<GeneratedPageStatus>().toEqualTypeOf<'draft' | 'published' | 'archived'>();
    });

    it('ApiProvider is a union of openrouter | perplexity | tavily | openai | serpapi', () => {
      expectTypeOf<ApiProvider>().toEqualTypeOf<'openrouter' | 'perplexity' | 'tavily' | 'openai' | 'serpapi'>();
    });
  });

  describe('Workflow type aliases', () => {
    it('WorkflowReviewMode matches PipelineReviewMode', () => {
      expectTypeOf<WorkflowReviewMode>().toEqualTypeOf<PipelineReviewMode>();
    });

    it('WorkflowRunStatus matches PipelineRunStatus', () => {
      expectTypeOf<WorkflowRunStatus>().toEqualTypeOf<PipelineRunStatus>();
    });

    it('Workflow matches pipelines table Row type', () => {
      type PipelinesRow = Tables['pipelines']['Row'];
      expectTypeOf<Workflow>().toEqualTypeOf<PipelinesRow>();
    });

    it('WorkflowRun matches pipeline_runs table Row type', () => {
      type PipelineRunsRow = Tables['pipeline_runs']['Row'];
      expectTypeOf<WorkflowRun>().toEqualTypeOf<PipelineRunsRow>();
    });
  });
});
