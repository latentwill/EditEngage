import { createServerSupabaseClient } from '$lib/server/supabase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('content')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  return json({ data }, { status: 200 });
};

export const PATCH: RequestHandler = async ({ request, params, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { title, body: contentBody, meta_description, tags } = body;

  const updatePayload: Record<string, unknown> = {};
  if (title !== undefined) updatePayload.title = title;
  if (contentBody !== undefined) updatePayload.body = contentBody;
  if (meta_description !== undefined) updatePayload.meta_description = meta_description;
  if (tags !== undefined) updatePayload.tags = tags;

  const { data, error } = await supabase
    .from('content')
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
