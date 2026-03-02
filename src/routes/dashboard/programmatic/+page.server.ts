import { createServerSupabaseClient } from '$lib/server/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, cookies }) => {
  const { projects } = await parent();
  const activeProjectId = projects[0]?.id ?? '';

  if (!activeProjectId) {
    return { templates: [] };
  }

  const supabase = createServerSupabaseClient(cookies);

  const { data: templates } = await supabase
    .from('templates')
    .select('*')
    .eq('project_id', activeProjectId)
    .order('created_at', { ascending: false });

  return { templates: templates ?? [] };
};
