import { createServerSupabaseClient } from '$lib/server/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, cookies }) => {
  const { projects } = await parent();
  const supabase = createServerSupabaseClient(cookies);

  const activeProjectId = projects[0]?.id ?? '';

  if (!activeProjectId) {
    return {
      projectId: '',
      subscription: null
    };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      projectId: activeProjectId,
      subscription: null
    };
  }

  const { data: subscriptions } = await supabase
    .from('notification_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('project_id', activeProjectId);

  return {
    projectId: activeProjectId,
    subscription: subscriptions?.[0] ?? null
  };
};
