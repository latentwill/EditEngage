import { createServerSupabaseClient } from '$lib/server/supabase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ContentStatus } from '$lib/types/database.js';

const VALID_ACTIONS = ['approve', 'reject'] as const;
const MAX_BULK_IDS = 100;

export const POST: RequestHandler = async ({ request, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { action, ids } = body;

  if (!VALID_ACTIONS.includes(action)) {
    return json({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` }, { status: 400 });
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return json({ error: 'ids must be a non-empty array' }, { status: 400 });
  }

  if (ids.length > MAX_BULK_IDS) {
    return json({ error: `ids must not exceed ${MAX_BULK_IDS} items` }, { status: 400 });
  }

  const statusMap: Record<string, ContentStatus> = {
    approve: 'approved',
    reject: 'rejected'
  };

  const { data, error } = await supabase
    .from('content')
    .update({ status: statusMap[action] })
    .in('id', ids)
    .select();

  if (error) {
    console.error('Database error:', error);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  return json({ data }, { status: 200 });
};
