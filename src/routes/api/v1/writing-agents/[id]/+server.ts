import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { createServerSupabaseClient } from '$lib/server/supabase.js';

export const PATCH: RequestHandler = async ({ params, request, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { is_active } = body;

  if (typeof is_active !== 'boolean') {
    return json({ error: 'is_active must be a boolean' }, { status: 400 });
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
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    console.error('[writing-agents PATCH] DB error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }

  return json({ data: agent });
};
