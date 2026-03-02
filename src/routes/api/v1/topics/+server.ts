import { createServerSupabaseClient } from '$lib/server/supabase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { TopicStatus } from '$lib/types/database.js';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projectId = url.searchParams.get('project_id');
  if (!projectId) {
    return json({ error: 'project_id is required' }, { status: 400 });
  }

  const status = url.searchParams.get('status');

  let query = supabase
    .from('topic_queue')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status as TopicStatus);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Database error:', error);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  return json({ data }, { status: 200 });
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { project_id, title, keywords, notes, pipeline_id } = body;

  if (!title) {
    return json({ error: 'title is required' }, { status: 400 });
  }

  if (!project_id) {
    return json({ error: 'project_id is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('topic_queue')
    .insert({
      project_id,
      title,
      keywords: keywords ?? [],
      notes: notes ?? null,
      pipeline_id: pipeline_id ?? null
    })
    .select()
    .single();

  if (error) {
    console.error('Database error:', error);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  return json({ data }, { status: 201 });
};
