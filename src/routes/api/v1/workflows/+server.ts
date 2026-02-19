import { createServerSupabaseClient } from '$lib/server/supabase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

async function getUserProjectIds(supabase: ReturnType<typeof createServerSupabaseClient>, userId: string) {
  // Get user's org memberships
  const { data: memberships, error: memberError } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', userId);

  if (memberError || !memberships) return [];

  const orgIds = memberships.map((m: { org_id: string }) => m.org_id);

  // Get projects in those orgs
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('id, org_id')
    .in('org_id', orgIds);

  if (projectError || !projects) return [];
  return projects;
}

export const GET: RequestHandler = async ({ cookies, url }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projects = await getUserProjectIds(supabase, user.id);
  const projectIds = projects.map((p: { id: string }) => p.id);

  const projectIdFilter = url.searchParams.get('project_id');

  let query = supabase.from('pipelines').select('*');

  if (projectIdFilter) {
    query = query.eq('project_id', projectIdFilter);
  } else {
    query = query.in('project_id', projectIds);
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
  const { project_id, name, description, schedule, review_mode, steps, is_active } = body;

  // Verify user has access to the project via org membership
  const projects = await getUserProjectIds(supabase, user.id);
  const projectIds = projects.map((p: { id: string }) => p.id);

  if (!projectIds.includes(project_id)) {
    return json({ error: 'Forbidden: you do not have access to this project' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('pipelines')
    .insert({ project_id, name, description, schedule, review_mode, steps, is_active })
    .select()
    .single();

  if (error) {
    console.error('Database error:', error);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  return json({ data }, { status: 201 });
};
