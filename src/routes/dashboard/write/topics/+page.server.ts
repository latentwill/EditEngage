import { createServerSupabaseClient } from '$lib/server/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, cookies }) => {
  const { projects } = await parent();
  const supabase = createServerSupabaseClient(cookies);

  const activeProjectId = projects[0]?.id ?? '';

  if (!activeProjectId) {
    return {
      topics: [],
      varietyMemory: []
    };
  }

  const { data: topics } = await supabase
    .from('topic_queue')
    .select('*')
    .eq('project_id', activeProjectId)
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: varietyMemory } = await supabase
    .from('variety_memory')
    .select('*')
    .eq('project_id', activeProjectId)
    .order('created_at', { ascending: false })
    .limit(50);

  return {
    topics: topics ?? [],
    varietyMemory: varietyMemory ?? []
  };
};
