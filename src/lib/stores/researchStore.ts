import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ResearchQueryStatus } from '../types/database.js';

type Client = SupabaseClient<Database>;

type ResearchQueryRow = Database['public']['Tables']['research_queries']['Row'];

export interface ResearchStore {
  readonly queries: ResearchQueryRow[];
  readonly loading: boolean;
  readonly searchTerm: string;
  readonly providerFilter: string | null;
  loadQueries(projectId?: string): Promise<void>;
  searchQueries(term: string): void;
  filterByProvider(provider: string | null): void;
  runQuery(queryId: string): Promise<void>;
}

export function createResearchStore(client: Client): ResearchStore {
  let queries: ResearchQueryRow[] = [];
  let loading = false;
  let allQueries: ResearchQueryRow[] = [];
  let searchTerm = '';
  let providerFilter: string | null = null;

  function applyFilters(): void {
    let filtered = allQueries;

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(q => q.name.toLowerCase().includes(lower));
    }

    if (providerFilter) {
      filtered = filtered.filter(q => {
        const chain = q.provider_chain as { provider: string; role: string }[] | null;
        return chain?.some((entry: { provider: string; role: string }) => entry.provider === providerFilter) ?? false;
      });
    }

    queries = filtered;
  }

  async function loadQueries(projectId?: string): Promise<void> {
    loading = true;

    let query = client
      .from('research_queries')
      .select('*');

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error || !data) {
      loading = false;
      return;
    }

    allQueries = data as ResearchQueryRow[];
    applyFilters();
    loading = false;
  }

  function searchQueries(term: string): void {
    searchTerm = term;
    applyFilters();
  }

  function filterByProvider(provider: string | null): void {
    providerFilter = provider;
    applyFilters();
  }

  async function runQuery(queryId: string): Promise<void> {
    await client
      .from('research_queries')
      .update({ status: 'running' as ResearchQueryStatus })
      .eq('id', queryId);
  }

  return {
    get queries() { return queries; },
    get loading() { return loading; },
    get searchTerm() { return searchTerm; },
    get providerFilter() { return providerFilter; },
    loadQueries,
    searchQueries,
    filterByProvider,
    runQuery,
  };
}
