import { createServerSupabaseClient } from '$lib/server/supabase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request, params, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { status, title, keywords, notes } = body;

  const updatePayload: Record<string, unknown> = {};
  if (status !== undefined) updatePayload.status = status;
  if (title !== undefined) updatePayload.title = title;
  if (keywords !== undefined) updatePayload.keywords = keywords;
  if (notes !== undefined) updatePayload.notes = notes;

  if (status === 'completed') {
    updatePayload.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('topic_queue')
    .update(updatePayload)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    console.error('Database error:', error);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  return json({ data }, { status: 200 });
};

export const DELETE: RequestHandler = async ({ params, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('topic_queue')
    .delete()
    .eq('id', params.id);

  if (error) {
    console.error('Database error:', error);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  return json({ success: true }, { status: 200 });
};
