import { createServerSupabaseClient } from '$lib/server/supabase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('content')
    .update({ status: 'approved' })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    console.error('Database error:', error);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  return json({ data }, { status: 200 });
};
