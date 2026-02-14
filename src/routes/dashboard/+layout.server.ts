import { createServerSupabaseClient } from '$lib/server/supabase';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw redirect(303, '/auth/login');
  }

  // Get user's organization memberships
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id);

  const orgIds = (memberships ?? []).map((m: { org_id: string }) => m.org_id);

  // Get projects for those organizations
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .in('org_id', orgIds);

  return {
    projects: projects ?? [],
    session: { user: { id: user.id, email: user.email ?? '' } }
  };
};
