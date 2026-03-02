-- ============================================================================
-- EditEngage v2 — User Preferences Table
-- Stores per-user preferences (favorite projects, default project)
-- ============================================================================

-- ============================================================================
-- TABLE: user_preferences
-- ============================================================================

create table user_preferences (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade unique,
  favorite_projects uuid[] not null default '{}',
  default_project   uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table user_preferences is 'Per-user preferences. One row per user, scoped by auth.uid().';

create trigger trg_user_preferences_updated_at
  before update on user_preferences
  for each row execute function update_updated_at_column();

-- ============================================================================
-- RLS
-- ============================================================================

alter table user_preferences enable row level security;

-- Users can view their own preferences
create policy "Users can view own preferences"
  on user_preferences for select
  using (user_id = auth.uid());

-- Users can insert their own preferences
create policy "Users can insert own preferences"
  on user_preferences for insert
  with check (user_id = auth.uid());

-- Users can update their own preferences
create policy "Users can update own preferences"
  on user_preferences for update
  using (user_id = auth.uid());

-- Users can delete their own preferences
create policy "Users can delete own preferences"
  on user_preferences for delete
  using (user_id = auth.uid());
