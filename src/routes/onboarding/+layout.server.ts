import { createServerSupabaseClient } from '$lib/server/supabase';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw redirect(303, '/auth/login');
  }

  const { data: memberships } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id);

  // User already has an org — skip onboarding
  if (memberships && memberships.length > 0) {
    throw redirect(303, '/dashboard');
  }

  return {};
};
