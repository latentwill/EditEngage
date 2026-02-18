import { redirect } from '@sveltejs/kit';
import { createServerSupabaseClient } from '$lib/server/supabase';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const code = url.searchParams.get('code');

  if (code) {
    const supabase = createServerSupabaseClient(cookies);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw redirect(303, '/auth/login?error=invalid_code');
    }
  }

  throw redirect(303, '/dashboard');
};
