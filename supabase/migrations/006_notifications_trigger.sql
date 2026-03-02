-- ============================================================================
-- EditEngage v2 — Notifications Trigger
-- Automatically creates per-user notifications when a project event is inserted
-- ============================================================================

-- ============================================================================
-- FUNCTION: create_notifications_from_event
-- ============================================================================
-- When a new event row is inserted, look up every member of the project's
-- organization and insert a notification for each one.
-- ============================================================================

create or replace function create_notifications_from_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, project_id, event_id, title, message)
  select
    om.user_id,
    new.project_id,
    new.id,
    new.event_type,
    coalesce(new.description, new.event_type)
  from public.organization_members om
  join public.projects p on p.org_id = om.org_id
  where p.id = new.project_id;

  return new;
end;
$$;

comment on function create_notifications_from_event() is 'Trigger function: fans out a single project event into per-user notification rows for every org member.';

-- ============================================================================
-- TRIGGER: trg_events_create_notifications
-- ============================================================================

create trigger trg_events_create_notifications
  after insert on events
  for each row
  execute function create_notifications_from_event();
