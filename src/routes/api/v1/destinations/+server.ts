import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { createServerSupabaseClient } from '$lib/server/supabase.js';

const ALLOWED_KEY_TYPES = ['admin', 'content'] as const;

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

  const { data, error } = await supabase
    .from('destinations')
    .select('*')
    .eq('project_id', projectId);

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
  const { project_id, type, name, config } = body;

  if (!project_id) {
    return json({ error: 'project_id is required' }, { status: 400 });
  }

  if (!type || !name) {
    return json({ error: 'type and name are required' }, { status: 400 });
  }

  // Validate key_type for Ghost destinations
  if (type === 'ghost' && config?.key_type !== undefined) {
    if (!ALLOWED_KEY_TYPES.includes(config.key_type)) {
      return json({ error: 'key_type must be "admin" or "content"' }, { status: 400 });
    }
  }

  // Verify the authenticated user owns this project (defense-in-depth on top of RLS)
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('id', project_id)
    .single();

  if (projectError || !project) {
    return json({ error: 'Project not found or access denied' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('destinations')
    .insert({ project_id, type, name, config })
    .select()
    .single();

  if (error) {
    console.error('Database error:', error);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  return json({ data }, { status: 201 });
};
