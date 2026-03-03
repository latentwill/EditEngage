import type { PageServerLoad } from './$types';
import { createServerSupabaseClient } from '$lib/server/supabase';

export const load: PageServerLoad = async ({ cookies }) => {
  const supabase = createServerSupabaseClient(cookies);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { org: null };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership) return { org: null };

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, vocabulary_labels, default_writing_style_preset, default_destination_types, ui_theme, enabled_modules, tenant_type')
    .eq('id', membership.org_id)
    .single();

  return { org, role: membership.role };
};
