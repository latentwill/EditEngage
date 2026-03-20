/**
 * @behavior Feed editor page renders ContentEditor with the correct content data
 * @business_rule The page passes server-loaded content to ContentEditor for display and editing
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$app/navigation', () => ({
  goto: vi.fn()
}));

vi.mock('$lib/stores/editorStore', () => ({
  createEditorStore: vi.fn(() => ({
    content: null,
    loading: false,
    position: 0,
    total: 0,
    hasNext: false,
    hasPrev: false,
    loadContent: vi.fn(),
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

describe('Feed editor page renders ContentEditor with content data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render ContentEditor with the content title', async () => {
    const FeedEditor = (await import('./+page.svelte')).default;

    render(FeedEditor, { props: { data: { content: makeContent() } } });

    const titleInput = screen.getByTestId('editor-title-input') as HTMLInputElement;
    expect(titleInput.value).toBe('Test Article');
  });

  it('should render ContentEditor with a different content title when data changes', async () => {
    const FeedEditor = (await import('./+page.svelte')).default;

    render(FeedEditor, {
      props: { data: { content: makeContent({ id: 'content-xyz-789', title: 'Different Article' }) } }
    });

    const titleInput = screen.getByTestId('editor-title-input') as HTMLInputElement;
    expect(titleInput.value).toBe('Different Article');
  });
});
