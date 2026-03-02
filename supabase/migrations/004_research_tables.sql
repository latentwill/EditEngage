-- ============================================================================
-- EditEngage v2 — Research Tables
-- Research queries and briefs for multi-provider research pipelines
-- ============================================================================

-- Enum types
create type research_provider as enum ('perplexity', 'tavily', 'openai', 'serper', 'exa', 'brave', 'openrouter');
comment on type research_provider is 'Supported research provider types.';

create type research_provider_role as enum ('discovery', 'analysis', 'citation');
comment on type research_provider_role is 'Role a provider plays in the research chain.';

create type research_query_status as enum ('active', 'running', 'idle', 'error');
comment on type research_query_status is 'Current status of a research query.';

create type synthesis_mode as enum ('unified', 'per_provider', 'comparative');
comment on type synthesis_mode is 'How research findings are synthesised into a brief.';

-- ============================================================================
-- TABLE: research_queries
-- ============================================================================

create table research_queries (
  id                    uuid primary key default uuid_generate_v4(),
  project_id            uuid not null references projects(id) on delete cascade,
  name                  text not null,
  prompt_template       text,
  provider_chain        jsonb not null default '[]'::jsonb,
  synthesis_mode        synthesis_mode not null default 'unified',
  auto_generate_topics  boolean not null default false,
  schedule              text,
  pipeline_id           uuid references pipelines(id) on delete set null,
  status                research_query_status not null default 'idle',
  last_run_at           timestamptz,
  brief_count           integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table research_queries is 'Research query configurations. Each query defines a multi-provider research pipeline.';

create trigger trg_research_queries_updated_at
  before update on research_queries
  for each row execute function update_updated_at_column();

-- ============================================================================
-- TABLE: research_briefs
-- ============================================================================

create table research_briefs (
  id          uuid primary key default uuid_generate_v4(),
  query_id    uuid not null references research_queries(id) on delete cascade,
  summary     text,
  findings    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

comment on table research_briefs is 'Research briefs produced by running a research query.';

create index idx_research_queries_project_id on research_queries(project_id);
create index idx_research_queries_project_status on research_queries(project_id, status);
create index idx_research_queries_pipeline_id on research_queries(pipeline_id);
create index idx_research_briefs_query_id on research_briefs(query_id);

-- ============================================================================
-- RLS: research_queries
-- ============================================================================

alter table research_queries enable row level security;

create policy "Users can view their research_queries"
  on research_queries for select
  using (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

create policy "Admins can create research_queries"
  on research_queries for insert
  with check (
    project_id in (select get_user_admin_project_ids())
  );

create policy "Admins can update research_queries"
  on research_queries for update
  using (
    project_id in (select get_user_admin_project_ids())
  )
  with check (
    project_id in (select get_user_admin_project_ids())
  );

create policy "Admins can delete research_queries"
  on research_queries for delete
  using (
    project_id in (select get_user_admin_project_ids())
  );

-- ============================================================================
-- RLS: research_briefs
-- ============================================================================

alter table research_briefs enable row level security;

create policy "Users can view their research_briefs"
  on research_briefs for select
  using (
    query_id in (
      select rq.id from research_queries rq
      join projects p on p.id = rq.project_id
      where p.org_id in (select get_user_org_ids())
    )
  );

create policy "Admins can create research_briefs"
  on research_briefs for insert
  with check (
    query_id in (
      select rq.id from research_queries rq
      join projects p on p.id = rq.project_id
      where p.org_id in (select get_user_org_ids())
    )
  );

-- research_briefs are system-generated but admins can manage them
create policy "Admins can update research_briefs"
  on research_briefs for update
  using (
    query_id in (
      select rq.id from research_queries rq
      join projects p on p.id = rq.project_id
      where p.org_id in (select get_user_org_ids())
    )
  );

create policy "Admins can delete research_briefs"
  on research_briefs for delete
  using (
    query_id in (
      select rq.id from research_queries rq
      join projects p on p.id = rq.project_id
      join organization_members om on om.org_id = p.org_id
      where om.user_id = auth.uid() and om.role in ('owner', 'admin')
    )
  );
