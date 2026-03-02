import { createServerSupabaseClient } from '$lib/server/supabase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

async function getUserProjectIds(supabase: ReturnType<typeof createServerSupabaseClient>, userId: string) {
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', userId);

  if (!memberships) return [];

  const orgIds = memberships.map((m: { org_id: string }) => m.org_id);

  const { data: projects } = await supabase
    .from('projects')
    .select('id, org_id')
    .in('org_id', orgIds);

  if (!projects) return [];
  return projects;
}

export const GET: RequestHandler = async ({ params, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: pipeline, error: pipelineError } = await supabase
    .from('pipelines')
    .select('*')
    .eq('id', params.id)
    .single();

  if (pipelineError || !pipeline) {
    return json({ error: 'Pipeline not found' }, { status: 404 });
  }

  // Verify ownership through project membership
  const projects = await getUserProjectIds(supabase, user.id);
  const projectIds = projects.map((p: { id: string }) => p.id);

  if (!projectIds.includes(pipeline.project_id)) {
    return json({ error: 'Pipeline not found' }, { status: 404 });
  }

  return json({ data: pipeline }, { status: 200 });
};

export const PATCH: RequestHandler = async ({ params, request, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify pipeline exists
  const { data: existing, error: fetchError } = await supabase
    .from('pipelines')
    .select('*')
    .eq('id', params.id)
    .single();

  if (fetchError || !existing) {
    return json({ error: 'Pipeline not found' }, { status: 404 });
  }

  // Verify ownership through project membership
  const projects = await getUserProjectIds(supabase, user.id);
  const projectIds = projects.map((p: { id: string }) => p.id);

  if (!projectIds.includes(existing.project_id)) {
    return json({ error: 'Pipeline not found' }, { status: 404 });
  }

  const body = await request.json();

  // Input validation
  if (typeof body.name === 'string' && body.name.length > 255) {
    return json({ error: 'name must not exceed 255 characters' }, { status: 400 });
  }
  if (typeof body.description === 'string' && body.description.length > 5000) {
    return json({ error: 'description must not exceed 5000 characters' }, { status: 400 });
  }

  const allowedFields: Record<string, unknown> = {};

  if (typeof body.is_active === 'boolean') allowedFields.is_active = body.is_active;
  if (typeof body.name === 'string') allowedFields.name = body.name;
  if (typeof body.description === 'string') allowedFields.description = body.description;

  const { data: updated, error: updateError } = await supabase
    .from('pipelines')
    .update(allowedFields)
    .eq('id', params.id)
    .select()
    .single();

  if (updateError || !updated) {
    console.error('Database error:', updateError);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  return json({ data: updated }, { status: 200 });
};
