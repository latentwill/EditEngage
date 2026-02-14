import { createServerSupabaseClient } from '$lib/server/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, cookies }) => {
  const { projects } = await parent();
  const supabase = createServerSupabaseClient(cookies);

  const activeProjectId = projects[0]?.id ?? '';

  if (!activeProjectId) {
    return {
      contentItems: [],
      pipelines: []
    };
  }

  // Fetch content items with pipeline name via pipeline_runs -> pipelines join
  const { data: contentItems } = await supabase
    .from('content')
    .select('*, pipeline_runs(pipelines(name))')
    .eq('project_id', activeProjectId)
    .order('created_at', { ascending: false })
    .limit(50);

  const mappedContent = (contentItems ?? []).map((item: Record<string, unknown>) => {
    const pipelineRun = item.pipeline_runs as Record<string, unknown> | null;
    const pipeline = pipelineRun?.pipelines as Record<string, unknown> | null;
    return {
      ...item,
      pipeline_name: (pipeline?.name as string) ?? 'Unknown'
    };
  });

  // Fetch pipelines for filter dropdown
  const { data: pipelines } = await supabase
    .from('pipelines')
    .select('id, name')
    .eq('project_id', activeProjectId)
    .order('name');

  return {
    contentItems: mappedContent,
    pipelines: pipelines ?? []
  };
};
