import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { createServerSupabaseClient } from '$lib/server/supabase.js';

async function signGhostAdminJwt(id: string, hexSecret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const headerJson = JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: id });
  const payloadJson = JSON.stringify({ iat: now, exp: now + 300, aud: '/admin/' });

  const toBase64Url = (str: string) =>
    btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const header = toBase64Url(headerJson);
  const payload = toBase64Url(payloadJson);
  const signingInput = `${header}.${payload}`;

  const keyBytes = new Uint8Array(
    (hexSecret.match(/.{1,2}/g) ?? []).map((byte) => parseInt(byte, 16))
  );
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(signingInput));
  const signature = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${signingInput}.${signature}`;
}

async function checkGhost(config: Record<string, unknown>): Promise<{ status: 'healthy' | 'unhealthy'; message: string }> {
  const apiUrl = String(config.api_url ?? '').replace(/\/$/, '');
  const keyType = config.key_type as 'admin' | 'content';
  const key = String(config.key ?? '');

  try {
    let res: Response;

    if (keyType === 'content') {
      res = await fetch(`${apiUrl}/ghost/api/content/settings/?key=${encodeURIComponent(key)}`);
    } else {
      const colonIdx = key.indexOf(':');
      const id = key.slice(0, colonIdx);
      const hexSecret = key.slice(colonIdx + 1);
      const jwt = await signGhostAdminJwt(id, hexSecret);
      res = await fetch(`${apiUrl}/ghost/api/admin/site/`, {
        headers: { Authorization: `Ghost ${jwt}` }
      });
    }

    if (res.ok) {
      return { status: 'healthy', message: 'Connection successful' };
    }
    return { status: 'unhealthy', message: `Ghost API returned ${res.status}` };
  } catch (err) {
    return { status: 'unhealthy', message: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export const POST: RequestHandler = async ({ params, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: destination, error: destError } = await supabase
    .from('destinations')
    .select('id, type, config')
    .eq('id', params.id)
    .single();

  if (destError || !destination) {
    return json({ error: 'Destination not found' }, { status: 404 });
  }

  const config = destination.config as Record<string, unknown>;

  if (destination.type === 'ghost') {
    const result = await checkGhost(config);
    return json(result, { status: 200 });
  }

  return json({ error: `Health check not supported for type: ${destination.type}` }, { status: 400 });
};
