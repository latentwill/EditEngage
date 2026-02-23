import { createServerSupabaseClient } from '$lib/server/supabase';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw error(401, 'Unauthorized');
  }

  const { data: query, error: queryError } = await supabase
    .from('research_queries')
    .select('*')
    .eq('id', params.id)
    .single();

  if (queryError || !query) {
    throw error(404, 'Research query not found');
  }

  const { data: briefs, error: briefsError } = await supabase
    .from('research_briefs')
    .select('*')
    .eq('query_id', params.id)
    .order('created_at', { ascending: false });

  if (briefsError) {
    throw error(500, 'Failed to load briefs');
  }

  let pipelineName: string | null = null;
  if (query.pipeline_id) {
    const { data: pipeline } = await supabase
      .from('pipelines')
      .select('name')
      .eq('id', query.pipeline_id)
      .single();

    pipelineName = pipeline?.name ?? null;
  }

  return {
    query,
    briefs: briefs ?? [],
    pipelineName
  };
};
