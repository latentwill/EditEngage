import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { createServerSupabaseClient } from '$lib/server/supabase.js';
import { encryptApiKey, decryptApiKey } from '$lib/server/crypto.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function maskKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

export const PATCH: RequestHandler = async ({ request, params, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!UUID_RE.test(params.id)) {
    return json({ error: 'Invalid id format' }, { status: 400 });
  }

  const body = await request.json();
  const { api_key, is_active } = body;

  if (api_key !== undefined && typeof api_key !== 'string') {
    return json({ error: 'api_key must be a string' }, { status: 400 });
  }
  if (is_active !== undefined && typeof is_active !== 'boolean') {
    return json({ error: 'is_active must be a boolean' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (api_key !== undefined) updateData.api_key = encryptApiKey(api_key);
  if (is_active !== undefined) updateData.is_active = is_active;

  if (Object.keys(updateData).length === 0) {
    return json({ error: 'At least one of api_key or is_active is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('api_keys')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    console.error('api-keys PATCH: DB error', error.code);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  return json({ data: { ...data, api_key: maskKey(decryptApiKey(data.api_key)) } }, { status: 200 });
};

export const DELETE: RequestHandler = async ({ params, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!UUID_RE.test(params.id)) {
    return json({ error: 'Invalid id format' }, { status: 400 });
  }

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', params.id);

  if (error) {
    console.error('api-keys DELETE: DB error', error.code);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  return new Response(null, { status: 204 });
};
