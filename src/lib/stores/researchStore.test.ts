/**
 * @behavior Research store manages research queries with loading, search, and provider filtering
 * @business_rule Users can view, search, and filter their research queries, scoped by project
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ResearchProvider, ResearchProviderRole, SynthesisMode, ResearchQueryStatus } from '../types/database.js';

type ResearchQueryRow = Database['public']['Tables']['research_queries']['Row'];

/** Builds a fake research query row for testing. */
function fakeQuery(overrides: Partial<ResearchQueryRow> & { id: string }): ResearchQueryRow {
  return {
    id: overrides.id,
    project_id: overrides.project_id ?? 'proj-1',
    name: overrides.name ?? `Query ${overrides.id}`,
    prompt_template: overrides.prompt_template ?? 'Research {{topic}}',
    provider_chain: overrides.provider_chain ?? [
      { provider: 'perplexity' as ResearchProvider, role: 'discovery' as ResearchProviderRole }
    ],
    synthesis_mode: overrides.synthesis_mode ?? ('unified' as SynthesisMode),
    auto_generate_topics: overrides.auto_generate_topics ?? false,
    schedule: overrides.schedule ?? null,
    pipeline_id: overrides.pipeline_id ?? null,
    status: overrides.status ?? ('active' as ResearchQueryStatus),
    last_run_at: overrides.last_run_at ?? null,
    brief_count: overrides.brief_count ?? 0,
    created_at: overrides.created_at ?? '2026-02-22T01:00:00Z',
    updated_at: overrides.updated_at ?? '2026-02-22T01:00:00Z',
  };
}

/**
 * Creates a chainable mock Supabase client for research_queries.
 */
function createMockClient() {
  let resolvedData: ResearchQueryRow[] = [];
  let resolvedError: { message: string } | null = null;
  const calls: Record<string, unknown[]> = {
    select: [],
    eq: [],
    order: [],
    update: [],
  };

  const chain = {
    select: vi.fn((...args: unknown[]) => { calls.select.push(args); return chain; }),
    eq: vi.fn((...args: unknown[]) => { calls.eq.push(args); return chain; }),
    order: vi.fn((...args: unknown[]) => { calls.order.push(args); return chain; }),
    update: vi.fn((...args: unknown[]) => { calls.update.push(args); return chain; }),
    then: undefined as unknown,
  };

  // Make the chain thenable so `await` resolves it
  chain.then = (resolve: (val: { data: ResearchQueryRow[] | null; error: typeof resolvedError }) => void) => {
    resolve({ data: resolvedError ? null : resolvedData, error: resolvedError });
  };

  const from = vi.fn(() => chain);

  const client = { from } as unknown as SupabaseClient<Database>;

  return {
    client,
    chain,
    calls,
    from,
    mockResolvedData(data: ResearchQueryRow[]) { resolvedData = data; resolvedError = null; },
    mockResolvedError(msg: string) { resolvedError = { message: msg }; resolvedData = []; },
  };
}

describe('Research Store', () => {
  let mock: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mock = createMockClient();
  });

  it('should load research queries from Supabase', async () => {
    const queries = [
      fakeQuery({ id: 'q-1', name: 'SEO Research' }),
      fakeQuery({ id: 'q-2', name: 'Competitor Analysis' }),
    ];
    mock.mockResolvedData(queries);

    const { createResearchStore } = await import('./researchStore.js');
    const store = createResearchStore(mock.client);
    await store.loadQueries();

    expect(mock.from).toHaveBeenCalledWith('research_queries');
    expect(store.queries).toHaveLength(2);
    expect(store.queries[0].name).toBe('SEO Research');
    expect(store.loading).toBe(false);
  });

  it('should filter queries by project_id when provided', async () => {
    const queries = [
      fakeQuery({ id: 'q-1', project_id: 'proj-a' }),
    ];
    mock.mockResolvedData(queries);

    const { createResearchStore } = await import('./researchStore.js');
    const store = createResearchStore(mock.client);
    await store.loadQueries('proj-a');

    expect(mock.chain.eq).toHaveBeenCalledWith('project_id', 'proj-a');
  });

  it('should search queries by name (client-side filter)', async () => {
    const queries = [
      fakeQuery({ id: 'q-1', name: 'SEO Research' }),
      fakeQuery({ id: 'q-2', name: 'Competitor Analysis' }),
      fakeQuery({ id: 'q-3', name: 'Market Research' }),
    ];
    mock.mockResolvedData(queries);

    const { createResearchStore } = await import('./researchStore.js');
    const store = createResearchStore(mock.client);
    await store.loadQueries();

    store.searchQueries('research');

    expect(store.queries).toHaveLength(2);
    expect(store.queries.map(q => q.id)).toEqual(['q-1', 'q-3']);
    expect(store.searchTerm).toBe('research');
  });

  it('should filter queries by provider in chain', async () => {
    const queries = [
      fakeQuery({
        id: 'q-1',
        name: 'Perplexity Query',
        provider_chain: [{ provider: 'perplexity' as ResearchProvider, role: 'discovery' as ResearchProviderRole }],
      }),
      fakeQuery({
        id: 'q-2',
        name: 'Tavily Query',
        provider_chain: [{ provider: 'tavily' as ResearchProvider, role: 'analysis' as ResearchProviderRole }],
      }),
      fakeQuery({
        id: 'q-3',
        name: 'Multi Query',
        provider_chain: [
          { provider: 'perplexity' as ResearchProvider, role: 'discovery' as ResearchProviderRole },
          { provider: 'tavily' as ResearchProvider, role: 'analysis' as ResearchProviderRole },
        ],
      }),
    ];
    mock.mockResolvedData(queries);

    const { createResearchStore } = await import('./researchStore.js');
    const store = createResearchStore(mock.client);
    await store.loadQueries();

    store.filterByProvider('perplexity');

    expect(store.queries).toHaveLength(2);
    expect(store.queries.map(q => q.id)).toEqual(['q-1', 'q-3']);
    expect(store.providerFilter).toBe('perplexity');
  });

  it('should call fetch POST to /api/v1/research/:id/run on runQuery', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jobId: 'job-1' })
    });
    vi.stubGlobal('fetch', mockFetch);

    mock.mockResolvedData([]);

    const { createResearchStore } = await import('./researchStore.js');
    const store = createResearchStore(mock.client);

    await store.runQuery('q-99');

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/research/q-99/run', {
      method: 'POST'
    });
  });

  it('should optimistically set local query status to running on runQuery', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jobId: 'job-1' })
    });
    vi.stubGlobal('fetch', mockFetch);

    const queries = [
      fakeQuery({ id: 'q-1', name: 'SEO Research', status: 'active' as ResearchQueryStatus }),
      fakeQuery({ id: 'q-2', name: 'Competitor Analysis', status: 'idle' as ResearchQueryStatus }),
    ];
    mock.mockResolvedData(queries);

    const { createResearchStore } = await import('./researchStore.js');
    const store = createResearchStore(mock.client);
    await store.loadQueries();

    expect(store.queries[0].status).toBe('active');

    await store.runQuery('q-1');

    const updatedQuery = store.queries.find(q => q.id === 'q-1');
    expect(updatedQuery?.status).toBe('running');
  });

  it('should filter queries by status', async () => {
    const queries = [
      fakeQuery({ id: 'q-1', name: 'Query A', status: 'active' as ResearchQueryStatus }),
      fakeQuery({ id: 'q-2', name: 'Query B', status: 'running' as ResearchQueryStatus }),
      fakeQuery({ id: 'q-3', name: 'Query C', status: 'active' as ResearchQueryStatus }),
      fakeQuery({ id: 'q-4', name: 'Query D', status: 'queued' as ResearchQueryStatus }),
    ];
    mock.mockResolvedData(queries);

    const { createResearchStore } = await import('./researchStore.js');
    const store = createResearchStore(mock.client);
    await store.loadQueries();

    store.filterByStatus('active');

    expect(store.queries).toHaveLength(2);
    expect(store.queries.map(q => q.id)).toEqual(['q-1', 'q-3']);
    expect(store.statusFilter).toBe('active');
  });

  it('should clear status filter when null is passed', async () => {
    const queries = [
      fakeQuery({ id: 'q-1', status: 'active' as ResearchQueryStatus }),
      fakeQuery({ id: 'q-2', status: 'running' as ResearchQueryStatus }),
    ];
    mock.mockResolvedData(queries);

    const { createResearchStore } = await import('./researchStore.js');
    const store = createResearchStore(mock.client);
    await store.loadQueries();

    store.filterByStatus('active');
    expect(store.queries).toHaveLength(1);

    store.filterByStatus(null);
    expect(store.queries).toHaveLength(2);
    expect(store.statusFilter).toBeNull();
  });

  it('should update query status to consumed via Supabase client', async () => {
    const queries = [
      fakeQuery({ id: 'q-1', name: 'SEO Research', status: 'complete' as ResearchQueryStatus }),
    ];
    mock.mockResolvedData(queries);

    const { createResearchStore } = await import('./researchStore.js');
    const store = createResearchStore(mock.client);
    await store.loadQueries();

    await store.markConsumed('q-1');

    expect(mock.from).toHaveBeenCalledWith('research_queries');
    expect(mock.chain.update).toHaveBeenCalledWith({ status: 'consumed' });
    expect(mock.chain.eq).toHaveBeenCalledWith('id', 'q-1');

    const updatedQuery = store.queries.find(q => q.id === 'q-1');
    expect(updatedQuery?.status).toBe('consumed');
  });

  it('should not update local state when runQuery fetch fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' })
    });
    vi.stubGlobal('fetch', mockFetch);

    const queries = [
      fakeQuery({ id: 'q-1', name: 'SEO Research', status: 'active' as ResearchQueryStatus }),
    ];
    mock.mockResolvedData(queries);

    const { createResearchStore } = await import('./researchStore.js');
    const store = createResearchStore(mock.client);
    await store.loadQueries();

    await store.runQuery('q-1');

    const query = store.queries.find(q => q.id === 'q-1');
    expect(query?.status).toBe('active');
  });
});
