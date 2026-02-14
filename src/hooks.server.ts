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

  return resolve(event);
};
