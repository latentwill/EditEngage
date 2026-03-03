import { createServerSupabaseClient } from '$lib/server/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, cookies }) => {
  const { projects } = await parent();
  const supabase = createServerSupabaseClient(cookies);

  const activeProjectId = projects[0]?.id ?? '';

  if (!activeProjectId) {
    return {
      totalContent: 0,
      publishedThisWeek: 0,
      pendingReview: 0,
      activeWorkflows: 0,
      recentWorkflowRuns: [],
      contentInReview: [],
      topicQueueHealth: { pendingCount: 0, nextScheduledRun: null },
      activeProjectId: '',
      recentEvents: []
    };
  }

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    { count: totalContent },
    { count: publishedThisWeek },
    { count: pendingReview },
    { count: activeWorkflows },
    { data: pipelineRuns },
    { data: contentInReview },
    { count: pendingTopics },
    { data: recentEvents }
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
      .eq('status', 'pending'),
    supabase
      .from('events')
      .select('*')
      .eq('project_id', activeProjectId)
      .order('created_at', { ascending: false })
      .limit(50)
  ]);

  const recentWorkflowRuns = (pipelineRuns ?? []).map((run) => ({
    ...run,
    pipeline_name: (run.pipelines as { name: string } | null)?.name ?? 'Unknown'
  }));

  return {
    totalContent: totalContent ?? 0,
    publishedThisWeek: publishedThisWeek ?? 0,
    pendingReview: pendingReview ?? 0,
    activeWorkflows: activeWorkflows ?? 0,
    recentWorkflowRuns,
    contentInReview: contentInReview ?? [],
    topicQueueHealth: {
      pendingCount: pendingTopics ?? 0,
      nextScheduledRun: null
    },
    activeProjectId,
    recentEvents: recentEvents ?? []
  };
};
