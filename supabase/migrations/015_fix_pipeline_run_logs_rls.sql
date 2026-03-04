-- MEDIUM-003: Fix overly permissive RLS policy on pipeline_run_logs
-- The "for all" policy with using(true)/with check(true) grants unrestricted
-- access to ALL roles, not just service_role. Replace with scoped policies.

-- Drop the overly permissive policy
drop policy if exists "Service role can insert/update logs" on pipeline_run_logs;

-- Service role insert: only the service_role (used by background workers)
-- can create new log entries.
create policy "Service role can insert logs"
  on pipeline_run_logs for insert
  to service_role
  with check (true);

-- Service role update: only the service_role can update existing log entries
-- (e.g., setting completed_at, duration_ms, status).
create policy "Service role can update logs"
  on pipeline_run_logs for update
  to service_role
  using (true)
  with check (true);
