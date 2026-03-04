create table pipeline_run_logs (
  id uuid primary key default uuid_generate_v4(),
  pipeline_run_id uuid not null references pipeline_runs(id) on delete cascade,
  step_index integer not null,
  agent_name text not null,
  status text not null default 'pending',
  log_output text,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index idx_pipeline_run_logs_run_step on pipeline_run_logs(pipeline_run_id, step_index);

-- RLS
alter table pipeline_run_logs enable row level security;

create policy "Users can read logs for their org's pipeline runs"
  on pipeline_run_logs for select
  using (
    pipeline_run_id in (
      select pr.id from pipeline_runs pr
      join pipelines p on pr.pipeline_id = p.id
      join projects proj on p.project_id = proj.id
      where proj.org_id in (select get_user_org_ids())
    )
  );

create policy "Service role can insert/update logs"
  on pipeline_run_logs for all
  using (true)
  with check (true);
