import { createServerSupabaseClient } from '$lib/server/supabase';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw error(401, 'Unauthorized');
  }

  const { data: content, error: fetchError } = await supabase
    .from('content')
    .select('*')
    .eq('id', params.id)
    .single();

  if (fetchError || !content) {
    throw error(404, 'Content not found');
  }

  return { content };
};
