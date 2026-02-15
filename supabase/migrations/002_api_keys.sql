-- ============================================================================
-- EditEngage v2 — API Keys Table
-- Stores per-project API keys for AI provider integrations
-- ============================================================================

-- Provider enum
create type api_provider as enum ('openrouter', 'perplexity', 'tavily', 'openai', 'serpapi');
comment on type api_provider is 'Supported AI provider types for API key management.';

-- ============================================================================
-- TABLE: api_keys
-- ============================================================================

create table api_keys (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  provider    api_provider not null,
  api_key     text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (project_id, provider)
);

comment on table api_keys is 'API keys for AI provider integrations. One key per provider per project.';
comment on column api_keys.api_key is 'The API key value. IMPORTANT: Must be encrypted at application layer before storage.';

-- Note: unique(project_id, provider) already provides an index with project_id
-- as the leading column, covering project_id-only lookups. No separate index needed.

create trigger trg_api_keys_updated_at
  before update on api_keys
  for each row execute function update_updated_at_column();

-- ============================================================================
-- Helper function for admin project access (used by RLS policies)
-- ============================================================================

create or replace function get_user_admin_project_ids()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select p.id from projects p
  join organization_members om on om.org_id = p.org_id
  where om.user_id = auth.uid() and om.role in ('owner', 'admin');
$$;

-- ============================================================================
-- RLS
-- ============================================================================

alter table api_keys enable row level security;

-- Users can view api_keys for projects in their orgs
create policy "Users can view their api_keys"
  on api_keys for select
  using (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

-- Owners and admins can insert api_keys
create policy "Admins can create api_keys"
  on api_keys for insert
  with check (
    project_id in (select get_user_admin_project_ids())
  );

-- Owners and admins can update api_keys
create policy "Admins can update api_keys"
  on api_keys for update
  using (
    project_id in (select get_user_admin_project_ids())
  );

-- Owners and admins can delete api_keys
create policy "Admins can delete api_keys"
  on api_keys for delete
  using (
    project_id in (select get_user_admin_project_ids())
  );
