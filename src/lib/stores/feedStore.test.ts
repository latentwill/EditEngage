/**
 * @behavior The feed store manages content items for the review feed,
 * supporting cursor-based pagination, multi-dimensional filtering
 * (status, pipeline, content type, project), and content status mutations.
 *
 * @business_rule Content is displayed newest-first (created_at DESC).
 * Pagination uses cursor-based approach (not offset) for stable ordering
 * when new items are inserted. "Pending" status filter maps to draft + in_review.
 * Approving content sets status to "approved"; rejecting sets status to "rejected"
 * and records the rejection reason.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.js';

type ContentRow = Database['public']['Tables']['content']['Row'];

interface ContentWithProject extends ContentRow {
  projects: { name: string; color: string | null } | null;
}

/** Builds a fake content row for testing. */
function fakeContent(overrides: Partial<ContentWithProject> & { id: string; created_at: string }): ContentWithProject {
  return {
    id: overrides.id,
    project_id: overrides.project_id ?? 'proj-1',
    pipeline_run_id: overrides.pipeline_run_id ?? null,
    title: overrides.title ?? `Content ${overrides.id}`,
    body: overrides.body ?? null,
    meta_description: overrides.meta_description ?? null,
    tags: overrides.tags ?? [],
    content_type: overrides.content_type ?? 'article',
    status: overrides.status ?? 'draft',
    published_at: overrides.published_at ?? null,
    published_url: overrides.published_url ?? null,
    destination_type: overrides.destination_type ?? null,
    destination_config: overrides.destination_config ?? null,
    created_at: overrides.created_at,
    updated_at: overrides.updated_at ?? overrides.created_at,
    projects: overrides.projects ?? { name: 'Test Project', color: '#3b82f6' },
  };
}

/**
 * Creates a chainable mock Supabase client.
 *
 * Each chain records calls to select/eq/or/order/limit/lt and
 * resolves with the data set via `mockResolvedData`.
 */
function createMockClient() {
  let resolvedData: ContentWithProject[] = [];
  let resolvedError: { message: string } | null = null;
  const calls: Record<string, unknown[]> = {
    select: [],
    eq: [],
    or: [],
    order: [],
    limit: [],
    lt: [],
    in: [],
    update: [],
  };

  const chain = {
    select: vi.fn((...args: unknown[]) => { calls.select.push(args); return chain; }),
    eq: vi.fn((...args: unknown[]) => { calls.eq.push(args); return chain; }),
    or: vi.fn((...args: unknown[]) => { calls.or.push(args); return chain; }),
    order: vi.fn((...args: unknown[]) => { calls.order.push(args); return chain; }),
    limit: vi.fn((...args: unknown[]) => { calls.limit.push(args); return chain; }),
    lt: vi.fn((...args: unknown[]) => { calls.lt.push(args); return chain; }),
    in: vi.fn((...args: unknown[]) => { calls.in.push(args); return chain; }),
    update: vi.fn((...args: unknown[]) => { calls.update.push(args); return chain; }),
    then: undefined as unknown,
  };

  // Make the chain thenable so `await` resolves it
  chain.then = (resolve: (val: { data: ContentWithProject[] | null; error: typeof resolvedError }) => void) => {
    resolve({ data: resolvedError ? null : resolvedData, error: resolvedError });
  };

  const from = vi.fn(() => chain);

  const client = { from } as unknown as SupabaseClient<Database>;

  return {
    client,
    chain,
    calls,
    from,
    mockResolvedData(data: ContentWithProject[]) { resolvedData = data; resolvedError = null; },
    mockResolvedError(msg: string) { resolvedError = { message: msg }; resolvedData = []; },
  };
}

describe('Feed Store', () => {
  let mock: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mock = createMockClient();
  });

  it('should fetch content ordered by created_at DESC', async () => {
    const items = [
      fakeContent({ id: 'c-3', created_at: '2026-02-22T03:00:00Z' }),
      fakeContent({ id: 'c-2', created_at: '2026-02-22T02:00:00Z' }),
      fakeContent({ id: 'c-1', created_at: '2026-02-22T01:00:00Z' }),
    ];
    mock.mockResolvedData(items);

    const { createFeedStore } = await import('./feedStore.js');
    const store = createFeedStore(mock.client);
    await store.loadFeed();

    expect(store.items[0].id).toBe('c-3');
    expect(store.items[2].id).toBe('c-1');
    expect(mock.chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('should paginate with cursor-based pagination (not offset)', async () => {
    const page1 = [
      fakeContent({ id: 'c-2', created_at: '2026-02-22T02:00:00Z' }),
      fakeContent({ id: 'c-1', created_at: '2026-02-22T01:00:00Z' }),
    ];
    mock.mockResolvedData(page1);

    const { createFeedStore } = await import('./feedStore.js');
    const store = createFeedStore(mock.client);
    await store.loadFeed();

    // Now load page 2 using cursor from last item
    const page2 = [
      fakeContent({ id: 'c-0', created_at: '2026-02-21T23:00:00Z' }),
    ];
    mock.mockResolvedData(page2);
    await store.loadFeed(undefined, '2026-02-22T01:00:00Z');

    // Cursor-based: should call .lt('created_at', cursor)
    expect(mock.chain.lt).toHaveBeenCalledWith('created_at', '2026-02-22T01:00:00Z');
    // Should NOT use offset-based pagination (.range)
    expect(mock.chain).not.toHaveProperty('range');
  });

  it('should filter by status', async () => {
    const pending = [
      fakeContent({ id: 'c-1', created_at: '2026-02-22T01:00:00Z', status: 'draft' }),
      fakeContent({ id: 'c-2', created_at: '2026-02-22T02:00:00Z', status: 'in_review' }),
    ];
    mock.mockResolvedData(pending);

    const { createFeedStore } = await import('./feedStore.js');
    const store = createFeedStore(mock.client);
    await store.loadFeed({ status: 'pending' });

    // "pending" maps to draft + in_review via .or()
    expect(mock.chain.or).toHaveBeenCalledWith('status.eq.draft,status.eq.in_review');
  });

  it('should filter by pipeline_id', async () => {
    const items = [
      fakeContent({ id: 'c-1', created_at: '2026-02-22T01:00:00Z' }),
    ];
    mock.mockResolvedData(items);

    const { createFeedStore } = await import('./feedStore.js');
    const store = createFeedStore(mock.client);
    await store.loadFeed({ pipeline_id: 'pipe-abc' });

    // pipeline_id filter goes through pipeline_runs, so we join via pipeline_run_id
    // The content table has pipeline_run_id which links to pipeline_runs(pipeline_id)
    // For simplicity, we filter on content's pipeline_run_id relationship
    expect(mock.chain.eq).toHaveBeenCalledWith('pipeline_runs.pipeline_id', 'pipe-abc');
  });

  it('should filter by content_type', async () => {
    const items = [
      fakeContent({ id: 'c-1', created_at: '2026-02-22T01:00:00Z', content_type: 'landing_page' }),
    ];
    mock.mockResolvedData(items);

    const { createFeedStore } = await import('./feedStore.js');
    const store = createFeedStore(mock.client);
    await store.loadFeed({ content_type: 'landing_page' });

    expect(mock.chain.eq).toHaveBeenCalledWith('content_type', 'landing_page');
  });

  it('should scope to selected project (or all projects)', async () => {
    const allItems = [
      fakeContent({ id: 'c-1', created_at: '2026-02-22T01:00:00Z', project_id: 'proj-1' }),
      fakeContent({ id: 'c-2', created_at: '2026-02-22T02:00:00Z', project_id: 'proj-2' }),
    ];
    mock.mockResolvedData(allItems);

    const { createFeedStore } = await import('./feedStore.js');
    const store = createFeedStore(mock.client);

    // "All Projects" -- no project_id filter applied
    await store.loadFeed({});
    const eqCallsBefore = mock.calls.eq.filter(
      (args) => args[0] === 'project_id'
    );
    expect(eqCallsBefore).toHaveLength(0);

    // Specific project filter
    mock.mockResolvedData([allItems[0]]);
    await store.loadFeed({ project_id: 'proj-1' });
    expect(mock.chain.eq).toHaveBeenCalledWith('project_id', 'proj-1');
  });

  it('should update content status via Supabase mutation', async () => {
    mock.mockResolvedData([]);

    const { createFeedStore } = await import('./feedStore.js');
    const store = createFeedStore(mock.client);

    await store.approveContent('c-99');
    expect(mock.chain.update).toHaveBeenCalledWith({ status: 'approved' });
    expect(mock.chain.eq).toHaveBeenCalledWith('id', 'c-99');

    // Reset calls for reject test
    mock.chain.update.mockClear();
    mock.chain.eq.mockClear();

    await store.rejectContent('c-100', 'Needs revision');
    expect(mock.chain.update).toHaveBeenCalledWith({
      status: 'rejected',
      destination_config: expect.objectContaining({ rejection_reason: 'Needs revision' }),
    });
    expect(mock.chain.eq).toHaveBeenCalledWith('id', 'c-100');
  });

  it('should load next page using cursor from last item', async () => {
    const page1 = Array.from({ length: 20 }, (_, i) => {
      const ts = new Date(2026, 1, 22, 0, 0, 0);
      ts.setMinutes(ts.getMinutes() - i);
      return fakeContent({ id: `c-${20 - i}`, created_at: ts.toISOString() });
    });
    mock.mockResolvedData(page1);

    const { createFeedStore } = await import('./feedStore.js');
    const store = createFeedStore(mock.client);
    await store.loadFeed();

    expect(store.items).toHaveLength(20);
    expect(store.hasMore).toBe(true);

    // Load more
    const page2 = [
      fakeContent({ id: 'c-0', created_at: '2026-02-21T23:00:00Z' }),
    ];
    mock.mockResolvedData(page2);
    await store.loadMore();

    // Should append, not replace
    expect(store.items).toHaveLength(21);
    // Should use cursor from last item of page 1
    const lastPage1Item = page1[page1.length - 1];
    expect(mock.chain.lt).toHaveBeenCalledWith('created_at', lastPage1Item.created_at);
  });
});
