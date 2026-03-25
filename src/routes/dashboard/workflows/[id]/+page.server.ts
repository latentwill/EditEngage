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

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('metadata->>pipeline_id', params.id)
    .order('created_at', { ascending: false })
    .limit(50);

  // Resolve step names (agents, topics, destinations)
  const steps = (pipeline.steps ?? []) as Array<{
    agent_id?: string;
    agent_type?: string;
    topic_id?: string;
    destination_id?: string;
    prompt?: string;
  }>;

  const agentIds = steps.map(s => s.agent_id).filter(Boolean) as string[];
  const topicIds = steps.map(s => s.topic_id).filter(Boolean) as string[];
  const destinationIds = steps.map(s => s.destination_id).filter(Boolean) as string[];

  // Fetch all topics and destinations for the project (for dropdown options)
  const [agentsResult, allTopicsResult, allDestinationsResult] = await Promise.all([
    agentIds.length > 0
      ? supabase.from('writing_agents').select('id, name').in('id', agentIds)
      : { data: [] },
    supabase.from('topic_queue').select('id, title').eq('project_id', pipeline.project_id).order('title'),
    supabase.from('destinations').select('id, name').eq('project_id', pipeline.project_id).order('name'),
  ]);

  const allTopics = (allTopicsResult.data ?? []) as Array<{ id: string; title: string }>;
  const allDestinations = (allDestinationsResult.data ?? []) as Array<{ id: string; name: string }>;

  const agentMap = Object.fromEntries((agentsResult.data ?? []).map(a => [a.id, a.name]));
  const topicMap = Object.fromEntries(allTopics.map(t => [t.id, t.title]));
  const destMap = Object.fromEntries(allDestinations.map(d => [d.id, d.name]));

  const resolvedSteps = steps.map((step, i) => ({
    index: i,
    agent_id: step.agent_id ?? null,
    agent_type: step.agent_type ?? 'writing',
    agent_name: agentMap[step.agent_id ?? ''] ?? 'Unknown Agent',
    topic_id: step.topic_id ?? null,
    topic_name: topicMap[step.topic_id ?? ''] ?? null,
    destination_id: step.destination_id ?? null,
    destination_name: destMap[step.destination_id ?? ''] ?? null,
    prompt: step.prompt ?? '',
  }));

  return {
    workflow: pipeline,
    resolvedSteps,
    allTopics,
    allDestinations,
    runs: runsWithSteps,
    events: events ?? []
  };
};
