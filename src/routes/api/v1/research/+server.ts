import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { createServerSupabaseClient } from '$lib/server/supabase.js';
import { resolveProjectId } from '$lib/server/project-access.js';

export const GET: RequestHandler = async ({ cookies, url }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projectId = await resolveProjectId(supabase, url.searchParams.get('project_id'), user.id);
  if (!projectId) {
    return json({ data: [] });
  }

  const { data: queries, error } = await supabase
    .from('research_queries')
    .select('id, name, status, provider_chain')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[research GET] DB error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }

  return json({ data: queries ?? [] });
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const projectId = await resolveProjectId(supabase, body.project_id, user.id);
  if (!projectId) {
    return json({ error: 'project_id is required' }, { status: 400 });
  }

  if (!body.name) {
    return json({ error: 'name is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('research_queries')
    .insert({ project_id: projectId, name: body.name, status: 'queued' as const })
    .select()
    .single();

  if (error) {
    console.error('[research POST] DB error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }

  return json({ data }, { status: 201 });
};
