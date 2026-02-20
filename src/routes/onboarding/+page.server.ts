import { createServerSupabaseClient, createServiceRoleClient } from '$lib/server/supabase';
import { redirect, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// load only confirms the user is authenticated — no side effects on GET
export const load: PageServerLoad = async ({ cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw redirect(303, '/auth/login');
  }

  return {};
};

// Org creation happens on POST (form action) — never on GET
export const actions: Actions = {
  default: async ({ cookies }) => {
    const anonClient = createServerSupabaseClient(cookies);
    const { data: { user }, error: authError } = await anonClient.auth.getUser();

    if (authError || !user) {
      throw redirect(303, '/auth/login');
    }

    // Use service role to bypass RLS — anon client cannot insert into organizations
    // before the user is already an org member (chicken-and-egg problem)
    const admin = createServiceRoleClient();

    // Idempotency guard: handles double-submit, browser back, or concurrent requests
    const { data: existingMember } = await admin
      .from('organization_members')
      .select('org_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMember) {
      throw redirect(303, '/dashboard');
    }

    // Check whether the DB trigger already created an org for this user
    // (trigger creates org but membership may have failed, or race with another tab)
    const { data: existingOrg } = await admin
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();

    let orgId: string;

    if (existingOrg) {
      // Org exists but membership is missing — attach the membership
      orgId = existingOrg.id;
    } else {
      // Create a fresh org
      const orgName = `${user.email ?? user.id}'s Workspace`;
      const { data: newOrg, error: orgError } = await admin
        .from('organizations')
        .insert({ name: orgName, owner_id: user.id })
        .select('id')
        .single();

      if (orgError || !newOrg) {
        console.error('[onboarding] org insert failed:', orgError);
        throw error(500, 'Failed to create your workspace. Please try again.');
      }

      orgId = newOrg.id;
    }

    const { error: memberError } = await admin
      .from('organization_members')
      .insert({ org_id: orgId, user_id: user.id, role: 'owner' });

    if (memberError) {
      console.error('[onboarding] membership insert failed:', memberError);
      // Only roll back if we created the org — if it was pre-existing, leave it alone
      if (!existingOrg) {
        await admin.from('organizations').delete().eq('id', orgId);
      }
      throw error(500, 'Failed to set up your workspace membership. Please try again.');
    }

    throw redirect(303, '/dashboard');
  }
};
