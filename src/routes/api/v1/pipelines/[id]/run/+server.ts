import { createServerSupabaseClient } from '$lib/server/supabase';
import { addPipelineJob } from '$lib/server/queue';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: pipeline, error: pipelineError } = await supabase
    .from('pipelines')
    .select('*')
    .eq('id', params.id)
    .single();

  if (pipelineError || !pipeline) {
    return json({ error: 'Pipeline not found' }, { status: 404 });
  }

  const steps = pipeline.steps as Array<{ agentType: string; config: Record<string, unknown> }>;

  const { data: pipelineRun, error: runError } = await supabase
    .from('pipeline_runs')
    .insert({
      pipeline_id: params.id,
      status: 'queued',
      current_step: 0,
      total_steps: steps.length
    })
    .select()
    .single();

  if (runError || !pipelineRun) {
    console.error('Database error:', runError);
    return json({ error: 'Failed to create pipeline run' }, { status: 500 });
  }

  const pipelineRunId = pipelineRun.id as string;

  await addPipelineJob({
    pipelineId: params.id,
    pipelineRunId,
    steps
  });

  return json({ jobId: pipelineRunId }, { status: 202 });
};
