/**
 * @behavior The editor store manages a single content item for editing,
 * supporting navigation through a filtered list of content IDs (set by
 * the feed page), saving edits, and approve/reject actions that
 * auto-advance to the next item in the queue.
 *
 * @business_rule Position is 1-based for display purposes. Approving
 * content sets status to "approved" and auto-advances to the next item.
 * Rejecting content sets status to "rejected", stores the rejection
 * reason in destination_config, and auto-advances to the next item.
 * Navigation wraps: hasNext is false on the last item, hasPrev is false
 * on the first item.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ContentStatus } from '../types/database.js';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
}));

type ContentRow = Database['public']['Tables']['content']['Row'];

/** Builds a fake content row for testing. */
function fakeContent(overrides: Partial<ContentRow> & { id: string }): ContentRow {
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
    created_at: overrides.created_at ?? '2026-02-22T01:00:00Z',
    updated_at: overrides.updated_at ?? '2026-02-22T01:00:00Z',
  };
}

/**
 * Creates a chainable mock Supabase client.
 *
 * Each chain records calls and resolves with data set via `mockResolvedData`.
 */
function createMockClient() {
  let resolvedData: ContentRow | ContentRow[] | null = null;
  let resolvedError: { message: string } | null = null;

  const calls: Record<string, unknown[]> = {
    select: [],
    eq: [],
    update: [],
    single: [],
  };

  const chain: Record<string, unknown> = {};

  const methods = ['from', 'select', 'eq', 'update', 'single'] as const;
  for (const method of methods) {
    chain[method] = vi.fn((...args: unknown[]) => {
      if (method in calls) {
        calls[method as keyof typeof calls].push(args);
      }
      return chain;
    });
  }

  // Make the chain thenable so `await` resolves it
  chain.then = (
    resolve: (val: { data: ContentRow | ContentRow[] | null; error: typeof resolvedError }) => void,
  ) => {
    const data = resolvedError ? null : resolvedData;
    resolve({ data, error: resolvedError });
  };

  const client = { from: chain.from } as unknown as SupabaseClient<Database>;

  return {
    client,
    chain,
    calls,
    mockResolvedData(data: ContentRow) {
      resolvedData = data;
      resolvedError = null;
    },
    mockResolvedError(msg: string) {
      resolvedError = { message: msg };
      resolvedData = null;
    },
  };
}

describe('Editor Store', () => {
  let mock: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    vi.resetModules();
    mock = createMockClient();
  });

  it('should load content by ID', async () => {
    const item = fakeContent({ id: 'content-1', title: 'My Article' });
    mock.mockResolvedData(item);

    const { createEditorStore } = await import('./editorStore.js');
    const store = createEditorStore(mock.client);
    await store.loadContent('content-1');

    expect(mock.chain.from).toHaveBeenCalledWith('content');
    expect((mock.chain.select as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('*');
    expect(mock.chain.eq).toHaveBeenCalledWith('id', 'content-1');
    expect(mock.chain.single).toHaveBeenCalled();
    expect(store.content).toEqual(item);
  });

  it('should set loading true while fetching', async () => {
    // Verify loading transitions through the fetch lifecycle.
    // We track loading state by recording it at each step.
    const item = fakeContent({ id: 'content-1' });
    const loadingStates: boolean[] = [];

    const { createEditorStore } = await import('./editorStore.js');
    const store = createEditorStore(mock.client);

    // Before fetch
    loadingStates.push(store.loading); // [false]

    // Override then to capture loading state mid-flight then resolve
    mock.chain.then = (
      resolve: (val: { data: ContentRow; error: null }) => void,
    ) => {
      loadingStates.push(store.loading); // [false, true] — loading is true when await hits
      resolve({ data: item, error: null });
    };

    await store.loadContent('content-1');
    loadingStates.push(store.loading); // [false, true, false]

    expect(loadingStates).toEqual([false, true, false]);
  });

  it('should compute position within filtered items', async () => {
    const itemB = fakeContent({ id: 'b', title: 'Item B' });
    mock.mockResolvedData(itemB);

    const { createEditorStore } = await import('./editorStore.js');
    const store = createEditorStore(mock.client);
    store.setFilteredIds(['a', 'b', 'c']);
    await store.loadContent('b');

    expect(store.position).toBe(2);
    expect(store.total).toBe(3);
  });

  it('should navigate to next item', async () => {
    const itemB = fakeContent({ id: 'b', title: 'Item B' });
    const itemC = fakeContent({ id: 'c', title: 'Item C' });

    mock.mockResolvedData(itemB);

    const { createEditorStore } = await import('./editorStore.js');
    const store = createEditorStore(mock.client);
    store.setFilteredIds(['a', 'b', 'c']);
    await store.loadContent('b');

    mock.mockResolvedData(itemC);
    await store.next();

    expect(store.content).toEqual(itemC);
    expect(store.position).toBe(3);
  });

  it('should navigate to previous item', async () => {
    const itemB = fakeContent({ id: 'b', title: 'Item B' });
    const itemA = fakeContent({ id: 'a', title: 'Item A' });

    mock.mockResolvedData(itemB);

    const { createEditorStore } = await import('./editorStore.js');
    const store = createEditorStore(mock.client);
    store.setFilteredIds(['a', 'b', 'c']);
    await store.loadContent('b');

    mock.mockResolvedData(itemA);
    await store.prev();

    expect(store.content).toEqual(itemA);
    expect(store.position).toBe(1);
  });

  it('should report hasNext false on last item', async () => {
    const itemC = fakeContent({ id: 'c', title: 'Item C' });
    mock.mockResolvedData(itemC);

    const { createEditorStore } = await import('./editorStore.js');
    const store = createEditorStore(mock.client);
    store.setFilteredIds(['a', 'b', 'c']);
    await store.loadContent('c');

    expect(store.hasNext).toBe(false);
    expect(store.hasPrev).toBe(true);
  });

  it('should report hasPrev false on first item', async () => {
    const itemA = fakeContent({ id: 'a', title: 'Item A' });
    mock.mockResolvedData(itemA);

    const { createEditorStore } = await import('./editorStore.js');
    const store = createEditorStore(mock.client);
    store.setFilteredIds(['a', 'b', 'c']);
    await store.loadContent('a');

    expect(store.hasPrev).toBe(false);
    expect(store.hasNext).toBe(true);
  });

  it('should save edits to content record', async () => {
    const item = fakeContent({ id: 'content-1', title: 'Old Title' });
    mock.mockResolvedData(item);

    const { createEditorStore } = await import('./editorStore.js');
    const store = createEditorStore(mock.client);
    await store.loadContent('content-1');

    // Reset call tracking for the save
    (mock.chain.update as ReturnType<typeof vi.fn>).mockClear();
    (mock.chain.eq as ReturnType<typeof vi.fn>).mockClear();
    mock.calls.update = [];
    mock.calls.eq = [];

    await store.saveContent({ title: 'New Title' });

    expect(mock.chain.from).toHaveBeenCalledWith('content');
    expect(mock.chain.update).toHaveBeenCalledWith({ title: 'New Title' });
    expect(mock.chain.eq).toHaveBeenCalledWith('id', 'content-1');
  });

  it('should approve and auto-advance to next', async () => {
    const itemB = fakeContent({ id: 'b', title: 'Item B', status: 'draft' });
    const itemC = fakeContent({ id: 'c', title: 'Item C' });

    mock.mockResolvedData(itemB);

    const { createEditorStore } = await import('./editorStore.js');
    const store = createEditorStore(mock.client);
    store.setFilteredIds(['a', 'b', 'c']);
    await store.loadContent('b');

    // Clear tracking before approve
    (mock.chain.update as ReturnType<typeof vi.fn>).mockClear();
    (mock.chain.eq as ReturnType<typeof vi.fn>).mockClear();
    mock.calls.update = [];
    mock.calls.eq = [];

    // After the update call resolves, the next loadContent will also use the chain
    // So we need to set up data for the next load
    let callCount = 0;
    mock.chain.then = (
      resolve: (val: { data: ContentRow | null; error: null }) => void,
    ) => {
      callCount++;
      // First resolution is the update, second is the loadContent for next
      if (callCount <= 1) {
        resolve({ data: itemB, error: null });
      } else {
        resolve({ data: itemC, error: null });
      }
    };

    await store.approve();

    // Should have called update with status approved
    expect(mock.chain.update).toHaveBeenCalledWith({ status: 'approved' as ContentStatus });

    // Should have auto-advanced to next item
    expect(store.content).toEqual(itemC);
    expect(store.position).toBe(3);
  });
});
