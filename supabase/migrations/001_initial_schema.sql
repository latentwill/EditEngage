-- ============================================================================
-- EditEngage v2 — Initial Database Schema
-- Supabase PostgreSQL Migration
-- ============================================================================
-- Entity hierarchy:
--   Organization
--     -> Project (property)
--         -> Destinations, Pipelines, TopicQueue, VarietyMemory,
--            WritingStyles, Content, Templates, GeneratedPages,
--            Events, Notifications
-- ============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

create type org_member_role as enum ('owner', 'admin', 'member');
comment on type org_member_role is 'Roles for organization membership. Owner has full control, admin can manage settings, member can use features.';

create type destination_type as enum ('ghost', 'postbridge', 'webhook');
comment on type destination_type is 'Supported publishing destination types.';

create type pipeline_review_mode as enum ('auto_publish', 'draft_for_review');
comment on type pipeline_review_mode is 'Whether pipeline output is published automatically or held for human review.';

create type pipeline_run_status as enum ('queued', 'running', 'completed', 'failed');
comment on type pipeline_run_status is 'Lifecycle states for a pipeline execution run.';

create type content_type as enum ('article', 'landing_page', 'social_post');
comment on type content_type is 'The kind of content produced by a pipeline.';

create type content_status as enum ('draft', 'in_review', 'approved', 'published', 'rejected');
comment on type content_status is 'Content lifecycle states. Transitions: draft -> in_review -> approved -> published, or in_review -> rejected.';

create type topic_status as enum ('pending', 'in_progress', 'completed', 'skipped');
comment on type topic_status is 'Topic queue item lifecycle states.';

create type template_data_source_type as enum ('csv', 'json', 'supabase_query', 'manual');
comment on type template_data_source_type is 'How data is sourced for programmatic SEO template rendering.';

create type generated_page_status as enum ('draft', 'published', 'archived');
comment on type generated_page_status is 'Lifecycle states for programmatic SEO pages.';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Returns all organization IDs the currently authenticated user belongs to.
-- Used in RLS policies to scope data access through the org membership chain.
create or replace function get_user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id
  from organization_members
  where user_id = auth.uid();
$$;

comment on function get_user_org_ids() is
  'Returns organization IDs for the authenticated user. Used by RLS policies to scope all project-level data.';

-- Auto-update updated_at timestamp on row modification.
create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function update_updated_at_column() is
  'Trigger function that sets updated_at to current timestamp on every UPDATE.';

-- ============================================================================
-- TABLE: organizations
-- ============================================================================

create table organizations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  settings    jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table organizations is 'Top-level tenant. All projects, data, and billing are scoped to an organization.';
comment on column organizations.owner_id is 'The user who created the org. Has immutable owner privileges.';
comment on column organizations.settings is 'Org-wide defaults (e.g., default LLM provider, billing tier).';

create index idx_organizations_owner_id on organizations(owner_id);

create trigger trg_organizations_updated_at
  before update on organizations
  for each row execute function update_updated_at_column();

-- ============================================================================
-- TABLE: organization_members
-- ============================================================================

create table organization_members (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references organizations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        org_member_role not null default 'member',
  created_at  timestamptz not null default now(),

  constraint uq_org_member unique (org_id, user_id)
);

comment on table organization_members is 'Maps users to organizations with role-based access. Every data access check flows through this table.';
comment on column organization_members.role is 'owner: full control. admin: manage settings and members. member: use features, create content.';

create index idx_org_members_user_id on organization_members(user_id);
create index idx_org_members_org_id on organization_members(org_id);

-- ============================================================================
-- TABLE: projects
-- ============================================================================

create table projects (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  description text,
  icon        text,
  color       text,
  domain      text,
  settings    jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table projects is 'A content property (e.g., "Extndly Blog", "Biron Blog"). All pipelines, content, and topics are scoped to a project.';
comment on column projects.domain is 'The website domain for this property (e.g., "extndly.com"). Used for URL generation and Ghost publishing.';
comment on column projects.settings is 'Project-level defaults: { default_llm, timezone, default_writing_style_id }.';
comment on column projects.icon is 'Icon identifier or emoji for the project switcher UI.';
comment on column projects.color is 'Hex color for visual differentiation in the project switcher.';

create index idx_projects_org_id on projects(org_id);

create trigger trg_projects_updated_at
  before update on projects
  for each row execute function update_updated_at_column();

-- ============================================================================
-- TABLE: destinations
-- ============================================================================

create table destinations (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  type        destination_type not null,
  name        text not null,
  config      jsonb not null default '{}',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table destinations is 'Publishing targets for pipeline output. Config contains API credentials (should be encrypted at application layer before storage).';
comment on column destinations.config is 'Destination-specific configuration. Ghost: { api_url, admin_api_key }. PostBridge: { api_key, account_id }. Webhook: { url, headers, method }. IMPORTANT: API keys must be encrypted before storing.';
comment on column destinations.is_active is 'Inactive destinations block pipeline publishing. Pipelines referencing an inactive destination will fail with a descriptive error.';

create index idx_destinations_project_id on destinations(project_id);
create index idx_destinations_project_type on destinations(project_id, type);

create trigger trg_destinations_updated_at
  before update on destinations
  for each row execute function update_updated_at_column();

-- ============================================================================
-- TABLE: writing_styles
-- ============================================================================

create table writing_styles (
  id               uuid primary key default uuid_generate_v4(),
  project_id       uuid not null references projects(id) on delete cascade,
  name             text not null,
  tone             text,
  voice_guidelines text,
  avoid_phrases    text[] not null default '{}',
  example_content  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table writing_styles is 'Brand voice definitions for AI content generation. Each project can have multiple styles (e.g., "Casual Blog" vs "Technical Docs").';
comment on column writing_styles.tone is 'High-level tone descriptor (e.g., "conversational", "authoritative", "playful").';
comment on column writing_styles.voice_guidelines is 'Detailed writing instructions passed to the LLM as system prompt context.';
comment on column writing_styles.avoid_phrases is 'Array of phrases the LLM should never use (e.g., "leverage", "synergy", "game-changer").';
comment on column writing_styles.example_content is 'Sample content that exemplifies the desired voice. Passed to the LLM as a reference.';

create index idx_writing_styles_project_id on writing_styles(project_id);

create trigger trg_writing_styles_updated_at
  before update on writing_styles
  for each row execute function update_updated_at_column();

-- ============================================================================
-- TABLE: pipelines
-- ============================================================================

create table pipelines (
  id           uuid primary key default uuid_generate_v4(),
  project_id   uuid not null references projects(id) on delete cascade,
  name         text not null,
  description  text,
  schedule     text,
  review_mode  pipeline_review_mode not null default 'draft_for_review',
  is_active    boolean not null default true,
  steps        jsonb not null default '[]',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table pipelines is 'A configured content workflow composed of ordered agent steps. Can run on a cron schedule or manually.';
comment on column pipelines.schedule is 'Cron expression (e.g., "0 9 * * 1" for Monday 9am). NULL means manual-only.';
comment on column pipelines.review_mode is 'auto_publish: content goes live immediately. draft_for_review: content is held for human approval.';
comment on column pipelines.steps is 'Ordered array of agent step configs: [{ "agent_type": "topic_queue", "config": {...}, "order": 1 }, ...]. Validated at save time.';

create index idx_pipelines_project_id on pipelines(project_id);
create index idx_pipelines_project_active on pipelines(project_id, is_active);

create trigger trg_pipelines_updated_at
  before update on pipelines
  for each row execute function update_updated_at_column();

-- ============================================================================
-- TABLE: pipeline_runs
-- ============================================================================

create table pipeline_runs (
  id            uuid primary key default uuid_generate_v4(),
  pipeline_id   uuid not null references pipelines(id) on delete cascade,
  status        pipeline_run_status not null default 'queued',
  current_step  int not null default 0,
  total_steps   int not null default 0,
  current_agent text,
  started_at    timestamptz,
  completed_at  timestamptz,
  result        jsonb,
  error         text,
  bullmq_job_id text,
  created_at    timestamptz not null default now()
);

comment on table pipeline_runs is 'Execution record for a single pipeline invocation. Tracks progress step-by-step and stores final result or error.';
comment on column pipeline_runs.current_step is 'Zero-indexed step currently being executed. Updated by the worker as each agent completes.';
comment on column pipeline_runs.result is 'Structured output from each completed step: { "steps": [{ "agent_type": "...", "output": {...} }] }.';
comment on column pipeline_runs.bullmq_job_id is 'Reference to the BullMQ job for status correlation with the worker service.';

create index idx_pipeline_runs_pipeline_id on pipeline_runs(pipeline_id);
create index idx_pipeline_runs_status on pipeline_runs(status);
create index idx_pipeline_runs_created_at on pipeline_runs(created_at desc);
create index idx_pipeline_runs_bullmq_job_id on pipeline_runs(bullmq_job_id);

-- ============================================================================
-- TABLE: content
-- ============================================================================

create table content (
  id                uuid primary key default uuid_generate_v4(),
  project_id        uuid not null references projects(id) on delete cascade,
  pipeline_run_id   uuid references pipeline_runs(id) on delete set null,
  title             text not null,
  body              jsonb,
  meta_description  text,
  tags              text[] not null default '{}',
  content_type      content_type not null default 'article',
  status            content_status not null default 'draft',
  published_at      timestamptz,
  published_url     text,
  destination_type  destination_type,
  destination_config jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table content is 'All generated content across all pipelines for a project. Central content library with lifecycle state management.';
comment on column content.body is 'Rich content body stored as JSON (e.g., Tiptap/ProseMirror document format, or { "html": "...", "text": "..." }).';
comment on column content.pipeline_run_id is 'NULL for manually created content. References the pipeline run that produced this content.';
comment on column content.destination_type is 'Where this content was (or will be) published.';
comment on column content.destination_config is 'Destination-specific metadata after publishing: { ghost_post_id, ghost_slug, social_post_ids }.';

create index idx_content_project_id on content(project_id);
create index idx_content_project_status on content(project_id, status);
create index idx_content_project_type on content(project_id, content_type);
create index idx_content_pipeline_run_id on content(pipeline_run_id);
create index idx_content_created_at on content(created_at desc);
create index idx_content_published_at on content(published_at desc nulls last);

create trigger trg_content_updated_at
  before update on content
  for each row execute function update_updated_at_column();

-- ============================================================================
-- TABLE: topic_queue
-- ============================================================================

create table topic_queue (
  id            uuid primary key default uuid_generate_v4(),
  project_id    uuid not null references projects(id) on delete cascade,
  pipeline_id   uuid references pipelines(id) on delete set null,
  title         text not null,
  keywords      text[] not null default '{}',
  seo_score     int,
  status        topic_status not null default 'pending',
  notes         text,
  completed_at  timestamptz,
  content_id    uuid references content(id) on delete set null,
  created_at    timestamptz not null default now()
);

comment on table topic_queue is 'Queue of content topics per project. Topics are consumed by the Topic Queue agent during pipeline runs.';
comment on column topic_queue.seo_score is 'Estimated SEO potential score (0-100). Used for prioritization.';
comment on column topic_queue.pipeline_id is 'Optional link to a specific pipeline. NULL means available to any pipeline in the project.';
comment on column topic_queue.content_id is 'Links to the content item produced from this topic. Set when status transitions to completed.';

create index idx_topic_queue_project_id on topic_queue(project_id);
create index idx_topic_queue_project_status on topic_queue(project_id, status);
create index idx_topic_queue_project_pending on topic_queue(project_id, seo_score desc nulls last)
  where status = 'pending';
create index idx_topic_queue_created_at on topic_queue(created_at desc);

-- ============================================================================
-- TABLE: variety_memory
-- ============================================================================

create table variety_memory (
  id              uuid primary key default uuid_generate_v4(),
  project_id      uuid not null references projects(id) on delete cascade,
  canonical_line  text not null,
  content_id      uuid references content(id) on delete set null,
  created_at      timestamptz not null default now()
);

comment on table variety_memory is 'Stores canonical representations of produced content to prevent topical overlap. Format: "intent | entity | angle".';
comment on column variety_memory.canonical_line is 'Canonicalized topic representation. The Variety Engine checks new topics against existing lines using similarity scoring.';
comment on column variety_memory.content_id is 'Link to the content produced from this canonical topic. NULL if content was deleted.';

create index idx_variety_memory_project_id on variety_memory(project_id);
create index idx_variety_memory_project_created on variety_memory(project_id, created_at desc);

-- ============================================================================
-- TABLE: templates (Programmatic SEO)
-- ============================================================================

create table templates (
  id                  uuid primary key default uuid_generate_v4(),
  project_id          uuid not null references projects(id) on delete cascade,
  name                text not null,
  slug_pattern        text not null,
  layout              text,
  sections            jsonb not null default '[]',
  seo_config          jsonb not null default '{}',
  data_source_type    template_data_source_type not null default 'manual',
  data_source_config  jsonb not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table templates is 'Programmatic SEO page templates. Define structure, variable slots, and data sources for batch page generation.';
comment on column templates.slug_pattern is 'URL slug pattern with variable placeholders: "best-ai-tool-for-{use_case}".';
comment on column templates.sections is 'Ordered array of page sections: [{ "type": "header", "template": "...", "variables": ["use_case"] }, ...].';
comment on column templates.seo_config is 'SEO metadata patterns: { "meta_title_pattern": "Best AI Tool for {use_case} | EditEngage", "meta_description_pattern": "..." }.';
comment on column templates.data_source_config is 'Data source configuration. CSV: { file_url }. JSON: { data }. supabase_query: { query }. Manual: { rows: [...] }.';

create index idx_templates_project_id on templates(project_id);

create trigger trg_templates_updated_at
  before update on templates
  for each row execute function update_updated_at_column();

-- ============================================================================
-- TABLE: generated_pages
-- ============================================================================

create table generated_pages (
  id                uuid primary key default uuid_generate_v4(),
  template_id       uuid not null references templates(id) on delete cascade,
  variables         jsonb not null default '{}',
  enriched_content  jsonb,
  slug              text not null,
  published_url     text,
  status            generated_page_status not null default 'draft',
  seo_score         int,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table generated_pages is 'Individual pages produced from a programmatic SEO template. Each page has unique variable values and LLM-enriched content.';
comment on column generated_pages.variables is 'The specific data row for this page: { "use_case": "bloggers", "price": "$29" }.';
comment on column generated_pages.enriched_content is 'LLM-generated unique content per section. Ensures pages are not mere variable substitutions.';
comment on column generated_pages.slug is 'The resolved URL slug (e.g., "best-ai-tool-for-bloggers"). Must be unique per template.';

create unique index idx_generated_pages_template_slug on generated_pages(template_id, slug);
create index idx_generated_pages_template_id on generated_pages(template_id);
create index idx_generated_pages_status on generated_pages(status);
create index idx_generated_pages_created_at on generated_pages(created_at desc);

create trigger trg_generated_pages_updated_at
  before update on generated_pages
  for each row execute function update_updated_at_column();

-- ============================================================================
-- TABLE: events
-- ============================================================================

create table events (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  event_type  text not null,
  description text not null,
  metadata    jsonb not null default '{}',
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on table events is 'Project-level event stream for the activity feed and command ticker. Powered by Supabase real-time subscriptions.';
comment on column events.event_type is 'Event category: pipeline.started, pipeline.completed, pipeline.failed, content.created, content.approved, content.published, content.rejected, topic.added, destination.configured.';
comment on column events.metadata is 'Structured event payload: { pipeline_id, pipeline_run_id, content_id, ... }. Varies by event_type.';

create index idx_events_project_id on events(project_id);
create index idx_events_project_created on events(project_id, created_at desc);
create index idx_events_project_unread on events(project_id, is_read)
  where is_read = false;

-- ============================================================================
-- TABLE: notifications
-- ============================================================================

create table notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  event_id    uuid references events(id) on delete set null,
  title       text not null,
  message     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on table notifications is 'Per-user notification inbox. Created from events but scoped to individual users for read/unread tracking.';
comment on column notifications.event_id is 'Optional link to the source event. NULL if the notification was system-generated without a project event.';

create index idx_notifications_user_id on notifications(user_id);
create index idx_notifications_user_unread on notifications(user_id, is_read)
  where is_read = false;
create index idx_notifications_project_id on notifications(project_id);
create index idx_notifications_created_at on notifications(created_at desc);

-- ============================================================================
-- TRIGGERS: Content status change -> event creation
-- ============================================================================

create or replace function create_content_status_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_desc text;
  event_type_val text;
begin
  -- Only fire when status actually changes
  if old.status is distinct from new.status then
    event_type_val := 'content.' || new.status::text;

    case new.status
      when 'draft' then
        event_desc := 'Content "' || new.title || '" created as draft';
      when 'in_review' then
        event_desc := 'Content "' || new.title || '" submitted for review';
      when 'approved' then
        event_desc := 'Content "' || new.title || '" approved';
      when 'published' then
        event_desc := 'Content "' || new.title || '" published';
      when 'rejected' then
        event_desc := 'Content "' || new.title || '" rejected';
      else
        event_desc := 'Content "' || new.title || '" status changed to ' || new.status::text;
    end case;

    insert into events (project_id, event_type, description, metadata)
    values (
      new.project_id,
      event_type_val,
      event_desc,
      jsonb_build_object(
        'content_id', new.id,
        'old_status', old.status::text,
        'new_status', new.status::text,
        'content_type', new.content_type::text,
        'pipeline_run_id', new.pipeline_run_id
      )
    );
  end if;

  return new;
end;
$$;

comment on function create_content_status_event() is
  'Trigger function that creates an event in the activity feed whenever content status changes.';

create trigger trg_content_status_event
  after update on content
  for each row execute function create_content_status_event();

-- Also create an event when new content is inserted (not just updated)
create or replace function create_content_insert_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into events (project_id, event_type, description, metadata)
  values (
    new.project_id,
    'content.created',
    'Content "' || new.title || '" created',
    jsonb_build_object(
      'content_id', new.id,
      'status', new.status::text,
      'content_type', new.content_type::text,
      'pipeline_run_id', new.pipeline_run_id
    )
  );

  return new;
end;
$$;

comment on function create_content_insert_event() is
  'Trigger function that creates an event when new content is inserted.';

create trigger trg_content_insert_event
  after insert on content
  for each row execute function create_content_insert_event();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table projects enable row level security;
alter table destinations enable row level security;
alter table writing_styles enable row level security;
alter table pipelines enable row level security;
alter table pipeline_runs enable row level security;
alter table content enable row level security;
alter table topic_queue enable row level security;
alter table variety_memory enable row level security;
alter table templates enable row level security;
alter table generated_pages enable row level security;
alter table events enable row level security;
alter table notifications enable row level security;

-- ============================================================================
-- RLS POLICIES: organizations
-- ============================================================================

-- Users can see orgs they belong to
create policy "Users can view their organizations"
  on organizations for select
  using (id in (select get_user_org_ids()));

-- Only the owner can update their org
create policy "Org owner can update organization"
  on organizations for update
  using (owner_id = auth.uid());

-- Any authenticated user can create an org
create policy "Authenticated users can create organizations"
  on organizations for insert
  with check (auth.uid() is not null and owner_id = auth.uid());

-- Only the owner can delete their org
create policy "Org owner can delete organization"
  on organizations for delete
  using (owner_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: organization_members
-- ============================================================================

-- Members can see other members in their orgs
create policy "Users can view members of their organizations"
  on organization_members for select
  using (org_id in (select get_user_org_ids()));

-- Owners and admins can add members
create policy "Org owners and admins can add members"
  on organization_members for insert
  with check (
    org_id in (
      select org_id from organization_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
    -- Also allow the org owner to add themselves during org creation
    or org_id in (
      select id from organizations where owner_id = auth.uid()
    )
  );

-- Owners and admins can update member roles
create policy "Org owners and admins can update members"
  on organization_members for update
  using (
    org_id in (
      select org_id from organization_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- Owners and admins can remove members. Members can remove themselves.
create policy "Org owners/admins can remove members, members can leave"
  on organization_members for delete
  using (
    user_id = auth.uid()
    or org_id in (
      select org_id from organization_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ============================================================================
-- RLS POLICIES: projects
-- Scoped through org membership
-- ============================================================================

create policy "Users can view projects in their organizations"
  on projects for select
  using (org_id in (select get_user_org_ids()));

create policy "Org owners and admins can create projects"
  on projects for insert
  with check (
    org_id in (
      select org_id from organization_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Org owners and admins can update projects"
  on projects for update
  using (
    org_id in (
      select org_id from organization_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Org owners can delete projects"
  on projects for delete
  using (
    org_id in (
      select org_id from organization_members
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- ============================================================================
-- RLS POLICIES: project-scoped tables
-- All follow the same pattern: project_id -> projects.org_id -> org membership
-- ============================================================================

-- Helper: check if user has access to a project
-- We inline this check in each policy for clarity and performance

-- --- destinations ---

create policy "Users can view destinations in their projects"
  on destinations for select
  using (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

create policy "Org owners and admins can manage destinations"
  on destinations for insert
  with check (
    project_id in (
      select p.id from projects p
      join organization_members om on om.org_id = p.org_id
      where om.user_id = auth.uid() and om.role in ('owner', 'admin')
    )
  );

create policy "Org owners and admins can update destinations"
  on destinations for update
  using (
    project_id in (
      select p.id from projects p
      join organization_members om on om.org_id = p.org_id
      where om.user_id = auth.uid() and om.role in ('owner', 'admin')
    )
  );

create policy "Org owners and admins can delete destinations"
  on destinations for delete
  using (
    project_id in (
      select p.id from projects p
      join organization_members om on om.org_id = p.org_id
      where om.user_id = auth.uid() and om.role in ('owner', 'admin')
    )
  );

-- --- writing_styles ---

create policy "Users can view writing styles in their projects"
  on writing_styles for select
  using (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

create policy "Members can create writing styles"
  on writing_styles for insert
  with check (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

create policy "Members can update writing styles"
  on writing_styles for update
  using (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

create policy "Org owners and admins can delete writing styles"
  on writing_styles for delete
  using (
    project_id in (
      select p.id from projects p
      join organization_members om on om.org_id = p.org_id
      where om.user_id = auth.uid() and om.role in ('owner', 'admin')
    )
  );

-- --- pipelines ---

create policy "Users can view pipelines in their projects"
  on pipelines for select
  using (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

create policy "Members can create pipelines"
  on pipelines for insert
  with check (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

create policy "Members can update pipelines"
  on pipelines for update
  using (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

create policy "Org owners and admins can delete pipelines"
  on pipelines for delete
  using (
    project_id in (
      select p.id from projects p
      join organization_members om on om.org_id = p.org_id
      where om.user_id = auth.uid() and om.role in ('owner', 'admin')
    )
  );

-- --- pipeline_runs ---
-- Access scoped through pipeline -> project -> org

create policy "Users can view pipeline runs in their projects"
  on pipeline_runs for select
  using (
    pipeline_id in (
      select pl.id from pipelines pl
      join projects p on p.id = pl.project_id
      where p.org_id in (select get_user_org_ids())
    )
  );

create policy "Members can create pipeline runs"
  on pipeline_runs for insert
  with check (
    pipeline_id in (
      select pl.id from pipelines pl
      join projects p on p.id = pl.project_id
      where p.org_id in (select get_user_org_ids())
    )
  );

create policy "Members can update pipeline runs"
  on pipeline_runs for update
  using (
    pipeline_id in (
      select pl.id from pipelines pl
      join projects p on p.id = pl.project_id
      where p.org_id in (select get_user_org_ids())
    )
  );

-- pipeline_runs are not directly deletable (cascade from pipeline delete)

-- --- content ---

create policy "Users can view content in their projects"
  on content for select
  using (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

create policy "Members can create content"
  on content for insert
  with check (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

create policy "Members can update content"
  on content for update
  using (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

create policy "Org owners and admins can delete content"
  on content for delete
  using (
    project_id in (
      select p.id from projects p
      join organization_members om on om.org_id = p.org_id
      where om.user_id = auth.uid() and om.role in ('owner', 'admin')
    )
  );

-- --- topic_queue ---

create policy "Users can view topics in their projects"
  on topic_queue for select
  using (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

create policy "Members can create topics"
  on topic_queue for insert
  with check (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

create policy "Members can update topics"
  on topic_queue for update
  using (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

create policy "Org owners and admins can delete topics"
  on topic_queue for delete
  using (
    project_id in (
      select p.id from projects p
      join organization_members om on om.org_id = p.org_id
      where om.user_id = auth.uid() and om.role in ('owner', 'admin')
    )
  );

-- --- variety_memory ---

create policy "Users can view variety memory in their projects"
  on variety_memory for select
  using (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

create policy "Members can create variety memory entries"
  on variety_memory for insert
  with check (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

-- variety_memory is append-only; no update policy needed

create policy "Org owners and admins can delete variety memory"
  on variety_memory for delete
  using (
    project_id in (
      select p.id from projects p
      join organization_members om on om.org_id = p.org_id
      where om.user_id = auth.uid() and om.role in ('owner', 'admin')
    )
  );

-- --- templates ---

create policy "Users can view templates in their projects"
  on templates for select
  using (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

create policy "Members can create templates"
  on templates for insert
  with check (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

create policy "Members can update templates"
  on templates for update
  using (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

create policy "Org owners and admins can delete templates"
  on templates for delete
  using (
    project_id in (
      select p.id from projects p
      join organization_members om on om.org_id = p.org_id
      where om.user_id = auth.uid() and om.role in ('owner', 'admin')
    )
  );

-- --- generated_pages ---
-- Access scoped through template -> project -> org

create policy "Users can view generated pages in their projects"
  on generated_pages for select
  using (
    template_id in (
      select t.id from templates t
      join projects p on p.id = t.project_id
      where p.org_id in (select get_user_org_ids())
    )
  );

create policy "Members can create generated pages"
  on generated_pages for insert
  with check (
    template_id in (
      select t.id from templates t
      join projects p on p.id = t.project_id
      where p.org_id in (select get_user_org_ids())
    )
  );

create policy "Members can update generated pages"
  on generated_pages for update
  using (
    template_id in (
      select t.id from templates t
      join projects p on p.id = t.project_id
      where p.org_id in (select get_user_org_ids())
    )
  );

create policy "Org owners and admins can delete generated pages"
  on generated_pages for delete
  using (
    template_id in (
      select t.id from templates t
      join projects p on p.id = t.project_id
      join organization_members om on om.org_id = p.org_id
      where om.user_id = auth.uid() and om.role in ('owner', 'admin')
    )
  );

-- --- events ---

create policy "Users can view events in their projects"
  on events for select
  using (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

create policy "System and members can create events"
  on events for insert
  with check (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

create policy "Members can mark events as read"
  on events for update
  using (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

-- --- notifications ---

create policy "Users can view their own notifications"
  on notifications for select
  using (user_id = auth.uid());

create policy "System can create notifications for users"
  on notifications for insert
  with check (
    -- The target user must be a member of the project's org
    user_id in (
      select om.user_id from organization_members om
      join projects p on p.org_id = om.org_id
      where p.id = project_id
    )
  );

create policy "Users can update their own notifications"
  on notifications for update
  using (user_id = auth.uid());

create policy "Users can delete their own notifications"
  on notifications for delete
  using (user_id = auth.uid());

-- ============================================================================
-- SUPABASE REAL-TIME: Enable for tables that power live UI
-- ============================================================================

-- Enable real-time for activity feed, ticker, and inline status
-- Run these via Supabase dashboard or use the publication approach:

-- Note: In Supabase, you add tables to the supabase_realtime publication.
-- This is typically done via the Supabase dashboard under Database > Replication,
-- or programmatically:

alter publication supabase_realtime add table events;
alter publication supabase_realtime add table pipeline_runs;
alter publication supabase_realtime add table content;
alter publication supabase_realtime add table notifications;

-- ============================================================================
-- SEED: Create org + member on first user signup (optional helper)
-- ============================================================================

-- This function can be called from a Supabase Auth trigger (on_auth_user_created)
-- to auto-create a personal org for every new user.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  -- Create a personal organization for the new user
  insert into organizations (name, owner_id)
  values (
    coalesce(new.raw_user_meta_data->>'full_name', new.email) || '''s Organization',
    new.id
  )
  returning id into new_org_id;

  -- Add user as owner member
  insert into organization_members (org_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  return new;
end;
$$;

comment on function handle_new_user() is
  'Auth trigger: auto-creates a personal organization and owner membership when a new user signs up.';

-- Attach to Supabase Auth trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
