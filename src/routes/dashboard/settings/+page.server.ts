import { createServerSupabaseClient } from '$lib/server/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, cookies }) => {
  const { projects } = await parent();
  const supabase = createServerSupabaseClient(cookies);

  const activeProjectId = projects[0]?.id ?? '';

  if (!activeProjectId) {
    return {
      project: null,
      projectId: ''
    };
  }

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', activeProjectId)
    .single();

  return {
    project: project ?? null,
    projectId: activeProjectId
  };
};
