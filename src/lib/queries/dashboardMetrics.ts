import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.js';

type Client = SupabaseClient<Database>;

export interface DashboardMetrics {
  publishedThisWeek: number;
  wordsGenerated: number;
  pendingReview: number;
  activePipelines: { active: number; total: number };
  publishedTrend: number;
}

function sevenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

function fourteenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 14);
  return d.toISOString();
}

export async function fetchPublishedThisWeek(
  client: Client,
  projectId?: string
): Promise<number> {
  let query = client
    .from('content')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .gte('published_at', sevenDaysAgo());

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

export async function fetchWordsGenerated(
  client: Client,
  projectId?: string
): Promise<number> {
  let query = client
    .from('content')
    .select('body')
    .eq('status', 'published')
    .gte('published_at', sevenDaysAgo());

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;
  if (error || !data) return 0;

  return data.reduce((sum: number, row: { body: Record<string, unknown> | null }) => {
    if (!row.body || typeof row.body !== 'object') return sum;
    const text = (row.body as { text?: string }).text;
    if (typeof text !== 'string') return sum;
    return sum + text.split(/\s+/).filter(Boolean).length;
  }, 0);
}

export async function fetchPendingReview(
  client: Client,
  projectId?: string
): Promise<number> {
  let query = client
    .from('content')
    .select('id', { count: 'exact', head: true })
    .or('status.eq.draft,status.eq.in_review');

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

export async function fetchActivePipelines(
  client: Client,
  projectId?: string
): Promise<{ active: number; total: number }> {
  let totalQuery = client
    .from('pipelines')
    .select('id', { count: 'exact', head: true });

  let activeQuery = client
    .from('pipelines')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  if (projectId) {
    totalQuery = totalQuery.eq('project_id', projectId);
    activeQuery = activeQuery.eq('project_id', projectId);
  }

  const [totalResult, activeResult] = await Promise.all([totalQuery, activeQuery]);

  return {
    total: totalResult.count ?? 0,
    active: activeResult.count ?? 0
  };
}

export async function fetchMetricTrends(
  client: Client,
  projectId?: string
): Promise<{ publishedTrend: number }> {
  let thisWeekQuery = client
    .from('content')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .gte('published_at', sevenDaysAgo());

  let lastWeekQuery = client
    .from('content')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .gte('published_at', fourteenDaysAgo())
    .lt('published_at', sevenDaysAgo());

  if (projectId) {
    thisWeekQuery = thisWeekQuery.eq('project_id', projectId);
    lastWeekQuery = lastWeekQuery.eq('project_id', projectId);
  }

  const [thisWeekResult, lastWeekResult] = await Promise.all([
    thisWeekQuery,
    lastWeekQuery
  ]);

  const thisWeek = thisWeekResult.count ?? 0;
  const lastWeek = lastWeekResult.count ?? 0;

  if (lastWeek === 0) return { publishedTrend: 0 };

  const trend = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  return { publishedTrend: trend };
}
