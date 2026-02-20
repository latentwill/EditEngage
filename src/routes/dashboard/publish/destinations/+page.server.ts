import { createServerSupabaseClient } from '$lib/server/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, cookies }) => {
  const { projects } = await parent();
  const supabase = createServerSupabaseClient(cookies);

  const activeProjectId = projects[0]?.id ?? '';

  if (!activeProjectId) {
    return {
      destinations: []
    };
  }

  const { data: destinations } = await supabase
    .from('destinations')
    .select('*')
    .eq('project_id', activeProjectId)
    .order('created_at', { ascending: false });

  return {
    destinations: destinations ?? [],
    projectId: activeProjectId
  };
};
