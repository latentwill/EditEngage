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
  let { data: memberships } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id);

  // Auto-create organization for new users with no memberships
  if (!memberships || memberships.length === 0) {
    const { data: newOrg } = await supabase
      .from('organizations')
      .insert({ name: `${user.email}'s Workspace`, owner_id: user.id })
      .select()
      .single();

    if (newOrg) {
      await supabase
        .from('organization_members')
        .insert({ org_id: newOrg.id, user_id: user.id, role: 'owner' });

      // Re-query memberships to get the new org
      const { data: refreshed } = await supabase
        .from('organization_members')
        .select('org_id')
        .eq('user_id', user.id);

      memberships = refreshed;
    }
  }

  const orgIds = (memberships ?? []).map((m: { org_id: string }) => m.org_id);

  // Get projects for those organizations
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .in('org_id', orgIds);

  return {
    projects: projects ?? [],
    orgId: orgIds[0],
    session: { user: { id: user.id, email: user.email ?? '' } }
  };
};
