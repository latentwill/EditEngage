import Logfire from '@pydantic/logfire-node';

try {
  Logfire.configure({
    serviceName: 'editengage-app',
    token: process.env.LOGFIRE_TOKEN
  });

  Logfire.span('app.startup', {
    attributes: { 'service.name': 'editengage-app' },
    callback: () => {
      console.log('[app] Logfire startup span sent');
    },
  });
} catch (err) {
  console.error('[app] Logfire initialization failed, continuing without tracing:', err);
}

import { runProbe } from '$lib/server/external-health';

if (process.env.ENABLE_EXTERNAL_HEALTH_CHECK === 'true') {
  const probeUrl = `https://${process.env.APP_DOMAIN}/api/health`;
  const intervalMs = Number(process.env.EXTERNAL_HEALTH_CHECK_INTERVAL_MS) || 300_000;
  const timeoutMs = Number(process.env.EXTERNAL_HEALTH_CHECK_TIMEOUT_MS) || 5_000;

  setInterval(() => {
    runProbe(probeUrl, timeoutMs).catch((err: unknown) => {
      console.error('[PROBE] External health probe error:', err);
    });
  }, intervalMs).unref();
}

import { createServerSupabaseClient } from '$lib/server/supabase';
import type { Handle } from '@sveltejs/kit';

const publicPaths = ['/', '/auth/login', '/auth/signup', '/auth/callback', '/api/health'];

export const handle: Handle = async ({ event, resolve }) => {
  const supabase = createServerSupabaseClient(event.cookies);
  event.locals.supabase = supabase;

  const { data: { user } } = await supabase.auth.getUser();
  event.locals.user = user;

  const isPublicPath = publicPaths.some(p => event.url.pathname === p || event.url.pathname.startsWith(p + '/'));

  if (!user && !isPublicPath && !event.url.pathname.startsWith('/api/health')) {
    if (event.url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(null, { status: 303, headers: { location: '/auth/login' } });
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });
};
