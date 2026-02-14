import { createServerSupabaseClient } from '$lib/server/supabase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

async function getUserOrgMemberships(supabase: ReturnType<typeof createServerSupabaseClient>, userId: string) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', userId);

  if (error || !data) return [];
  return data;
}

export const GET: RequestHandler = async ({ params, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const memberships = await getUserOrgMemberships(supabase, user.id);
  const orgIds = memberships.map((m: { org_id: string }) => m.org_id);

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .in('org_id', orgIds)
    .single();

  if (error || !data) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  return json({ data }, { status: 200 });
};

export const PATCH: RequestHandler = async ({ request, params, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, domain, settings, description } = body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (domain !== undefined) updates.domain = domain;
  if (settings !== undefined) updates.settings = settings;
  if (description !== undefined) updates.description = description;

  const memberships = await getUserOrgMemberships(supabase, user.id);
  const orgIds = memberships.map((m: { org_id: string }) => m.org_id);

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', params.id)
    .in('org_id', orgIds)
    .select()
    .single();

  if (error || !data) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  return json({ data }, { status: 200 });
};

export const DELETE: RequestHandler = async ({ params, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const memberships = await getUserOrgMemberships(supabase, user.id);
  const adminOrgs = memberships
    .filter((m: { role: string }) => m.role === 'owner' || m.role === 'admin')
    .map((m: { org_id: string }) => m.org_id);

  if (adminOrgs.length === 0) {
    return json({ error: 'Forbidden: admin or owner role required' }, { status: 403 });
  }

  await supabase
    .from('projects')
    .delete()
    .eq('id', params.id)
    .in('org_id', adminOrgs);

  return new Response(null, { status: 204 });
};
