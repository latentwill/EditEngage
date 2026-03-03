import { createServerSupabaseClient } from '$lib/server/supabase';
import type { PageServerLoad } from './$types';
import { buildAgentContextMap, type Pipeline, type EventRow, type WritingStyleRef } from './agentContext.js';

export const load: PageServerLoad = async ({ parent, cookies }) => {
  const { projects } = await parent();
  const supabase = createServerSupabaseClient(cookies);

  const activeProjectId = projects[0]?.id ?? '';

  if (!activeProjectId) {
    return { writingAgents: [], agentContextMap: {} };
  }

  const [
    { data: writingAgents },
    { data: pipelines },
    { data: events },
    { data: topicRows },
    { data: styles }
  ] = await Promise.all([
    supabase
      .from('writing_agents')
      .select('*')
      .eq('project_id', activeProjectId)
      .order('created_at', { ascending: false }),
    supabase
      .from('pipelines')
      .select('*')
      .eq('project_id', activeProjectId),
    supabase
      .from('events')
      .select('agent_id, created_at')
      .eq('project_id', activeProjectId)
      .not('agent_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('topic_queue')
      .select('pipeline_id')
      .eq('project_id', activeProjectId),
    supabase
      .from('writing_styles')
      .select('id, name')
      .eq('project_id', activeProjectId)
  ]);

  const agents = writingAgents ?? [];

  // Build topic counts per pipeline
  const topicCounts: Record<string, number> = {};
  for (const row of topicRows ?? []) {
    if (row.pipeline_id) {
      topicCounts[row.pipeline_id] = (topicCounts[row.pipeline_id] ?? 0) + 1;
    }
  }

  const agentContextMap = buildAgentContextMap(
    agents,
    (pipelines ?? []) as unknown as Pipeline[],
    (events ?? []) as EventRow[],
    topicCounts,
    (styles ?? []) as WritingStyleRef[]
  );

  return {
    writingAgents: agents,
    agentContextMap
  };
};
