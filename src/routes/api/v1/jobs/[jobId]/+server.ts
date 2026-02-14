import { createServerSupabaseClient } from '$lib/server/supabase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: run, error: runError } = await supabase
    .from('pipeline_runs')
    .select('*')
    .eq('id', params.jobId)
    .single();

  if (runError || !run) {
    return json({ error: 'Job not found' }, { status: 404 });
  }

  const status = run.status as string;

  if (status === 'completed') {
    return json({
      status,
      result: run.result
    });
  }

  if (status === 'failed') {
    return json({
      status,
      error: run.error
    });
  }

  return json({
    status,
    currentStep: run.current_step,
    totalSteps: run.total_steps,
    currentAgent: run.current_agent
  });
};
