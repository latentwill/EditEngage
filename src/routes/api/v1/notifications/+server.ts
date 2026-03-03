import { createServerSupabaseClient } from '$lib/server/supabase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, url }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limitParam = url.searchParams.get('limit');
  const offsetParam = url.searchParams.get('offset');
  const tierParam = url.searchParams.get('tier');
  const isReadParam = url.searchParams.get('is_read');
  const projectIdParam = url.searchParams.get('project_id');

  const limit = Math.min(Math.max(parseInt(limitParam ?? '20', 10) || 20, 1), 100);
  const offset = Math.max(parseInt(offsetParam ?? '0', 10) || 0, 0);

  let query = supabase
    .from('notifications')
    .select('*, events(event_type, module, agent_id, payload_summary, artifact_link)', { count: 'exact' })
    .eq('user_id', user.id);

  if (tierParam) {
    query = query.eq('tier', tierParam);
  }

  if (isReadParam !== null) {
    query = query.eq('is_read', isReadParam === 'true');
  }

  if (projectIdParam) {
    query = query.eq('project_id', projectIdParam);
  }

  query = query.order('created_at', { ascending: false });
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Database error:', error);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  return json({ notifications: data, total: count ?? 0 }, { status: 200 });
};
