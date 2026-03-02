import { createServerSupabaseClient } from '$lib/server/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, cookies }) => {
  const { projects } = await parent();
  const supabase = createServerSupabaseClient(cookies);
  const activeProjectId = projects[0]?.id ?? '';

  if (!activeProjectId) {
    return { projectId: '', apiKeys: [], destinations: [] };
  }

  const { data: apiKeys } = await supabase
    .from('api_keys')
    .select('*')
    .eq('project_id', activeProjectId);

  const { data: destinations } = await supabase
    .from('destinations')
    .select('*')
    .eq('project_id', activeProjectId);

  return {
    projectId: activeProjectId,
    apiKeys: apiKeys ?? [],
    destinations: destinations ?? []
  };
};
