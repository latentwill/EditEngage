import { createServerSupabaseClient } from '$lib/server/supabase';
import { addResearchJob } from '$lib/server/researchQueue';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

async function getUserProjectIds(supabase: ReturnType<typeof createServerSupabaseClient>, userId: string) {
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', userId);

  if (!memberships) return [];

  const orgIds = memberships.map((m: { org_id: string }) => m.org_id);

  const { data: projects } = await supabase
    .from('projects')
    .select('id, org_id')
    .in('org_id', orgIds);

  if (!projects) return [];
  return projects;
}

export const POST: RequestHandler = async ({ params, cookies }) => {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: query, error: queryError } = await supabase
    .from('research_queries')
    .select('*')
    .eq('id', params.id)
    .single();

  if (queryError || !query) {
    return json({ error: 'Research query not found' }, { status: 404 });
  }

  // Verify ownership through project membership
  const projects = await getUserProjectIds(supabase, user.id);
  const projectIds = projects.map((p: { id: string }) => p.id);

  if (!projectIds.includes(query.project_id)) {
    return json({ error: 'Research query not found' }, { status: 404 });
  }

  const providerChain = query.provider_chain as Array<{ provider: string; role: string }>;

  await supabase
    .from('research_queries')
    .update({ status: 'running' })
    .eq('id', params.id);

  const job = await addResearchJob({
    queryId: params.id,
    providerChain
  });

  return json({ jobId: job.id }, { status: 202 });
};
