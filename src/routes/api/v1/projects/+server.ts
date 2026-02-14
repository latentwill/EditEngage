import { createServerSupabaseClient } from '$lib/server/supabase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

async function getUserOrgIds(supabase: ReturnType<typeof createServerSupabaseClient>, userId: string) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', userId);

  if (error || !data) return [];
  return data;
}

export const GET: RequestHandler = async ({ cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const memberships = await getUserOrgIds(supabase, user.id);
  const orgIds = memberships.map((m: { org_id: string }) => m.org_id);

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .in('org_id', orgIds);

  if (error) {
    console.error('Database error:', error);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  return json({ data }, { status: 200 });
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { org_id, name, description, domain, settings } = body;

  const memberships = await getUserOrgIds(supabase, user.id);
  const orgIds = memberships.map((m: { org_id: string }) => m.org_id);

  if (!orgIds.includes(org_id)) {
    return json({ error: 'Forbidden: not a member of this organization' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({ org_id, name, description, domain, settings })
    .select()
    .single();

  if (error) {
    console.error('Database error:', error);
    return json({ error: 'An internal error occurred' }, { status: 500 });
  }

  return json({ data }, { status: 201 });
};
