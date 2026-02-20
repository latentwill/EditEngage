import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { createServerSupabaseClient } from '$lib/server/supabase.js';
import { encryptApiKey, decryptApiKey } from '$lib/server/crypto.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_PROVIDERS = ['openrouter', 'perplexity', 'tavily', 'openai', 'serpapi'];

function maskKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

export const GET: RequestHandler = async ({ url, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projectId = url.searchParams.get('project_id');
  if (!projectId) {
    return json({ error: 'project_id is required' }, { status: 400 });
  }

  if (!UUID_RE.test(projectId)) {
    return json({ error: 'Invalid project_id format' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('project_id', projectId);

  if (error) {
    console.error('api-keys GET: DB error', error.code);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  const masked = (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    api_key: maskKey(decryptApiKey(row.api_key as string))
  }));

  return json({ data: masked }, { status: 200 });
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { project_id, provider, api_key } = body;

  if (!project_id || !provider || !api_key) {
    return json({ error: 'project_id, provider, and api_key are required' }, { status: 400 });
  }

  if (!UUID_RE.test(project_id)) {
    return json({ error: 'Invalid project_id format' }, { status: 400 });
  }

  if (!VALID_PROVIDERS.includes(provider)) {
    return json({ error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` }, { status: 400 });
  }

  let encryptedKey: string;
  try {
    encryptedKey = encryptApiKey(api_key);
  } catch (err) {
    console.error('api-keys POST: encrypt error', err);
    return json({ error: 'Server configuration error - please contact support' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('api_keys')
    .upsert(
      { project_id, provider, api_key: encryptedKey },
      { onConflict: 'project_id,provider' }
    )
    .select()
    .single();

  if (error) {
    console.error('api-keys POST: DB error', error.code);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  return json({ data: { ...data, api_key: maskKey(api_key) } }, { status: 201 });
};
