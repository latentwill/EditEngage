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
