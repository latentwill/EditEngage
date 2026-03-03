import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { createServerSupabaseClient } from '$lib/server/supabase.js';

const ALLOWED_FIELDS = ['name', 'description', 'model', 'system_prompt', 'is_active'] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

export const PATCH: RequestHandler = async ({ params, request, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // Pick only allowed fields that are present in the body
  const updates: Partial<Record<AllowedField, string | boolean>> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      updates[field] = body[field] as string | boolean;
    }
  }

  if (Object.keys(updates).length === 0) {
    return json({ error: 'No valid fields provided. Allowed: name, description, model, system_prompt, is_active' }, { status: 400 });
  }

  // Verify the agent exists and belongs to a project the user can access (enforced by RLS)
  const { data: existing } = await supabase
    .from('writing_agents')
    .select('id')
    .eq('id', params.id)
    .single();

  if (!existing) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  const { data: agent, error } = await supabase
    .from('writing_agents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    console.error('[writing-agents PATCH] DB error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }

  return json({ data: agent });
};
