import { error } from '@sveltejs/kit';
import { createServerSupabaseClient } from '$lib/server/supabase';
import { getUserProjects } from '$lib/server/project-access';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw error(401, 'Unauthorized');
  }

  const { data: pipeline, error: pipelineError } = await supabase
    .from('pipelines')
    .select('*')
    .eq('id', params.id)
    .single();

  if (pipelineError || !pipeline) {
    throw error(404, 'Workflow not found');
  }

  const projects = await getUserProjects(supabase, user.id);
  const projectIds = projects.map((p) => p.id);

  if (!projectIds.includes(pipeline.project_id)) {
    throw error(404, 'Workflow not found');
  }

  const { data: runs } = await supabase
    .from('pipeline_runs')
    .select('*')
    .eq('pipeline_id', params.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const runList = runs ?? [];
  const runIds = runList.map((r: { id: string }) => r.id);

  let logs: Array<Record<string, unknown> & { pipeline_run_id: string; step_index: number }> = [];
  if (runIds.length > 0) {
    const { data: logData } = await supabase
      .from('pipeline_run_logs')
      .select('*')
      .in('pipeline_run_id', runIds)
      .order('step_index', { ascending: true });
    logs = logData ?? [];
  }

  const runsWithSteps = runList.map((run: { id: string }) => ({
    ...run,
    steps: logs
      .filter((log) => log.pipeline_run_id === run.id)
      .sort((a, b) => a.step_index - b.step_index)
  }));

  return {
    workflow: pipeline,
    runs: runsWithSteps
  };
};
