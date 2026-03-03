import { createServerSupabaseClient } from '$lib/server/supabase';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const VALID_TENANT_TYPES = ['content', 'research', 'enterprise'];
const VALID_MODULES = ['research', 'writing', 'publish'];

const UPDATABLE_FIELDS = [
  'vocabulary_labels',
  'default_writing_style_preset',
  'default_destination_types',
  'ui_theme',
  'enabled_modules',
  'tenant_type'
] as const;

async function getUserOrgMembership(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  userId: string,
  orgId: string
): Promise<{ org_id: string; role: string } | null> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .single();

  if (error || !data) return null;
  return data;
}

export const GET: RequestHandler = async ({ params, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const membership = await getUserOrgMembership(supabase, user.id, params.id);

  if (!membership) {
    return json({ error: 'Forbidden: not a member of this organization' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', params.id)
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

  const membership = await getUserOrgMembership(supabase, user.id, params.id);

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return json({ error: 'Forbidden: admin or owner role required' }, { status: 403 });
  }

  const body = await request.json();

  // Validate tenant_type
  if (body.tenant_type !== undefined && !VALID_TENANT_TYPES.includes(body.tenant_type)) {
    return json({ error: `Invalid tenant_type. Must be one of: ${VALID_TENANT_TYPES.join(', ')}` }, { status: 400 });
  }

  // Validate enabled_modules
  if (body.enabled_modules !== undefined) {
    const invalid = (body.enabled_modules as string[]).filter(
      (m: string) => !VALID_MODULES.includes(m)
    );
    if (invalid.length > 0) {
      return json({ error: `Invalid modules: ${invalid.join(', ')}. Must be subset of: ${VALID_MODULES.join(', ')}` }, { status: 400 });
    }
  }

  const updates: Record<string, unknown> = {};
  for (const field of UPDATABLE_FIELDS) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  const { data, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error || !data) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  return json({ data }, { status: 200 });
};
