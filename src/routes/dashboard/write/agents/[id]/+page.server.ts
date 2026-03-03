import { createServerSupabaseClient } from '$lib/server/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent, cookies }) => {
  const { projects } = await parent();
  const supabase = createServerSupabaseClient(cookies);

  const activeProjectId = projects[0]?.id ?? '';

  const { data: agent } = await supabase
    .from('writing_agents')
    .select('*')
    .eq('id', params.id)
    .single();

  return {
    agent: agent ?? null,
    projectId: activeProjectId
  };
};
