import { createServerSupabaseClient } from '$lib/server/supabase';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
  if (params.id === 'new') {
    return { template: null, mode: 'create' as const };
  }

  const supabase = createServerSupabaseClient(cookies);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw error(401, 'Unauthorized');

  const { data: template, error: fetchError } = await supabase
    .from('templates')
    .select('*')
    .eq('id', params.id)
    .single();

  if (fetchError || !template) throw error(404, 'Template not found');

  return { template, mode: 'edit' as const };
};
