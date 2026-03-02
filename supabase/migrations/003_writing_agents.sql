-- ============================================================================
-- EditEngage v2 — Writing Agents Table
-- Stores per-project AI writing agent configurations
-- ============================================================================

-- ============================================================================
-- TABLE: writing_agents
-- ============================================================================

create table writing_agents (
  id            uuid primary key default uuid_generate_v4(),
  project_id    uuid not null references projects(id) on delete cascade,
  name          text not null,
  description   text,
  model         text not null,
  system_prompt text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table writing_agents is 'AI writing agent configurations per project.';

create index idx_writing_agents_project_id on writing_agents(project_id);

create trigger trg_writing_agents_updated_at
  before update on writing_agents
  for each row execute function update_updated_at_column();

-- ============================================================================
-- RLS
-- ============================================================================

alter table writing_agents enable row level security;

-- Users can view writing_agents for projects in their orgs
create policy "Users can view their writing_agents"
  on writing_agents for select
  using (
    project_id in (
      select id from projects where org_id in (select get_user_org_ids())
    )
  );

-- Owners and admins can insert writing_agents
create policy "Admins can create writing_agents"
  on writing_agents for insert
  with check (
    project_id in (select get_user_admin_project_ids())
  );

-- Owners and admins can update writing_agents
create policy "Admins can update writing_agents"
  on writing_agents for update
  using (
    project_id in (select get_user_admin_project_ids())
  )
  with check (
    project_id in (select get_user_admin_project_ids())
  );

-- Owners and admins can delete writing_agents
create policy "Admins can delete writing_agents"
  on writing_agents for delete
  using (
    project_id in (select get_user_admin_project_ids())
  );
