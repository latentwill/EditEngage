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
    const { data: existing } = await admin
      .from('organization_members')
      .select('org_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      throw redirect(303, '/dashboard');
    }

    const orgName = `${user.email ?? user.id}'s Workspace`;

    const { data: newOrg, error: orgError } = await admin
      .from('organizations')
      .insert({ name: orgName, owner_id: user.id })
      .select()
      .single();

    if (orgError || !newOrg) {
      throw error(500, 'Failed to create your workspace. Please try again.');
    }

    const { error: memberError } = await admin
      .from('organization_members')
      .insert({ org_id: newOrg.id, user_id: user.id, role: 'owner' });

    if (memberError) {
      // Roll back the orphaned org to keep data consistent
      await admin.from('organizations').delete().eq('id', newOrg.id);
      throw error(500, 'Failed to set up your workspace membership. Please try again.');
    }

    throw redirect(303, '/dashboard');
  }
};
