import { createServerSupabaseClient } from '$lib/server/supabase';
import { getUserProjects } from '$lib/server/project-access';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

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
  const projects = await getUserProjects(supabase, user.id);
  const projectIds = projects.map((p) => p.id);

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
  const projects = await getUserProjects(supabase, user.id);
  const projectIds = projects.map((p) => p.id);

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

export const DELETE: RequestHandler = async ({ params, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify pipeline exists
  const { data: pipeline, error: pipelineError } = await supabase
    .from('pipelines')
    .select('*')
    .eq('id', params.id)
    .single();

  if (pipelineError || !pipeline) {
    return json({ error: 'Pipeline not found' }, { status: 404 });
  }

  // Verify ownership through project membership
  const projects = await getUserProjects(supabase, user.id);
  const projectIds = projects.map((p) => p.id);

  if (!projectIds.includes(pipeline.project_id)) {
    return json({ error: 'Pipeline not found' }, { status: 404 });
  }

  // Cascade delete: logs -> runs -> pipeline
  const { data: runs } = await supabase
    .from('pipeline_runs')
    .select('id')
    .eq('pipeline_id', params.id);

  const runIds = (runs ?? []).map((r: { id: string }) => r.id);

  if (runIds.length > 0) {
    await supabase
      .from('pipeline_run_logs')
      .delete()
      .in('pipeline_run_id', runIds);
  }

  await supabase
    .from('pipeline_runs')
    .delete()
    .eq('pipeline_id', params.id);

  await supabase
    .from('pipelines')
    .delete()
    .eq('id', params.id);

  return json({ success: true }, { status: 200 });
};
