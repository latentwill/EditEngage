import { createServerSupabaseClient } from '$lib/server/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, cookies }) => {
  const { projects, session } = await parent();
  const supabase = createServerSupabaseClient(cookies);

  const activeProjectId = projects[0]?.id ?? '';

  if (!activeProjectId) {
    return {
      totalContent: 0,
      publishedThisWeek: 0,
      pendingReview: 0,
      activePipelines: 0,
      recentPipelineRuns: [],
      contentInReview: [],
      topicQueueHealth: { pendingCount: 0, nextScheduledRun: null },
      activeProjectId: ''
    };
  }

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    { count: totalContent },
    { count: publishedThisWeek },
    { count: pendingReview },
    { count: activePipelines },
    { data: pipelineRuns },
    { data: contentInReview },
    { count: pendingTopics }
  ] = await Promise.all([
    supabase
      .from('content')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', activeProjectId),
    supabase
      .from('content')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', activeProjectId)
      .eq('status', 'published')
      .gte('published_at', weekAgo.toISOString()),
    supabase
      .from('content')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', activeProjectId)
      .eq('status', 'in_review'),
    supabase
      .from('pipelines')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', activeProjectId)
      .eq('is_active', true),
    supabase
      .from('pipeline_runs')
      .select('*, pipelines(name)')
      .eq('pipelines.project_id', activeProjectId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('content')
      .select('id, title, status, created_at')
      .eq('project_id', activeProjectId)
      .eq('status', 'in_review')
      .limit(5),
    supabase
      .from('topic_queue')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', activeProjectId)
      .eq('status', 'pending')
  ]);

  const recentPipelineRuns = (pipelineRuns ?? []).map((run: Record<string, unknown>) => ({
    ...run,
    pipeline_name: (run.pipelines as Record<string, unknown>)?.name ?? 'Unknown'
  }));

  return {
    totalContent: totalContent ?? 0,
    publishedThisWeek: publishedThisWeek ?? 0,
    pendingReview: pendingReview ?? 0,
    activePipelines: activePipelines ?? 0,
    recentPipelineRuns,
    contentInReview: contentInReview ?? [],
    topicQueueHealth: {
      pendingCount: pendingTopics ?? 0,
      nextScheduledRun: null
    },
    activeProjectId
  };
};
