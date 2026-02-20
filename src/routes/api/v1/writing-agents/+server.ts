import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { createServerSupabaseClient } from '$lib/server/supabase.js';

const ALLOWED_MODELS = [
  'anthropic/claude-sonnet-4-6',
  'anthropic/claude-opus-4-6',
  'anthropic/claude-haiku-4-5',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'google/gemini-2.0-flash',
  'meta-llama/llama-3.3-70b-instruct',
] as const;

export const GET: RequestHandler = async ({ cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .limit(1)
    .single();

  if (!project) {
    return json({ data: [] });
  }

  const { data: agents, error } = await supabase
    .from('writing_agents')
    .select('id, project_id, name, description, model, is_active, created_at, updated_at')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[writing-agents GET] DB error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }

  return json({ data: agents ?? [] });
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .limit(1)
    .single();

  if (!project) {
    return json({ error: 'No project found' }, { status: 404 });
  }

  const body = await request.json();
  const { name, description, model, system_prompt } = body;

  if (!name?.trim()) {
    return json({ error: 'Name is required' }, { status: 400 });
  }
  if (name.trim().length > 100) {
    return json({ error: 'Name must be 100 characters or fewer' }, { status: 400 });
  }
  if (!ALLOWED_MODELS.includes(model?.trim())) {
    return json({ error: 'Invalid model selection' }, { status: 400 });
  }
  if (system_prompt && system_prompt.length > 10000) {
    return json({ error: 'System prompt must be 10,000 characters or fewer' }, { status: 400 });
  }

  const { data: agent, error } = await supabase
    .from('writing_agents')
    .insert({
      project_id: project.id,
      name: name.trim(),
      description: description?.trim() || null,
      model: model.trim(),
      system_prompt: system_prompt?.trim() || null,
    })
    .select('id, project_id, name, description, model, is_active, created_at, updated_at')
    .single();

  if (error) {
    console.error('[writing-agents POST] DB error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }

  return json({ data: agent }, { status: 201 });
};
