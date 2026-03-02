/**
 * @behavior Feed editor page initializes the editor store with the content ID on mount
 * @business_rule The editor store must be loaded with the current content so approve/reject/navigate work correctly
 */
import { render } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$app/navigation', () => ({
  goto: vi.fn()
}));

const mockLoadContent = vi.fn();

vi.mock('$lib/stores/editorStore', () => ({
  createEditorStore: vi.fn(() => ({
    content: null,
    loading: false,
    position: 0,
    total: 0,
    hasNext: false,
    hasPrev: false,
    loadContent: mockLoadContent,
    setFilteredIds: vi.fn(),
    next: vi.fn(),
    prev: vi.fn(),
    saveContent: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
  }))
}));

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => ({}))
}));

function makeContent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'content-abc-123',
    project_id: 'proj-1',
    pipeline_run_id: null,
    title: 'Test Article',
    body: { html: '<p>Test body</p>' },
    meta_description: 'Test meta',
    tags: ['test'],
    content_type: 'article',
    status: 'in_review',
    published_at: null,
    published_url: null,
    destination_type: null,
    destination_config: null,
    created_at: '2026-02-20T10:00:00Z',
    updated_at: '2026-02-21T10:00:00Z',
    ...overrides
  };
}

describe('Editor store initialization on mount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call loadContent with the content ID on mount', async () => {
    const FeedEditor = (await import('./+page.svelte')).default;

    render(FeedEditor, { props: { data: { content: makeContent() } } });

    expect(mockLoadContent).toHaveBeenCalledWith('content-abc-123');
  });

  it('should call loadContent with a different content ID when data changes', async () => {
    const FeedEditor = (await import('./+page.svelte')).default;

    render(FeedEditor, {
      props: { data: { content: makeContent({ id: 'content-xyz-789' }) } }
    });

    expect(mockLoadContent).toHaveBeenCalledWith('content-xyz-789');
  });
});
