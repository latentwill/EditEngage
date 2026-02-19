import { error } from '@sveltejs/kit';
import { createServerSupabaseClient } from '$lib/server/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);

  const { data: pipeline, error: pipelineError } = await supabase
    .from('pipelines')
    .select('*')
    .eq('id', params.id)
    .single();

  if (pipelineError || !pipeline) {
    throw error(404, 'Workflow not found');
  }

  const { data: runs } = await supabase
    .from('pipeline_runs')
    .select('*')
    .eq('pipeline_id', params.id)
    .order('created_at', { ascending: false })
    .limit(20);

  return {
    workflow: pipeline,
    runs: runs ?? []
  };
};
