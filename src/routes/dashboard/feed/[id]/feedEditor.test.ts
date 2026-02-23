/**
 * @behavior Feed editor page renders a full-screen content editor with navigation, editing, and review actions
 * @business_rule Reviewers can edit content, approve/reject with reasons, and navigate through filtered items
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

const mockEditor = {
  content: null,
  loading: false,
  position: 3,
  total: 12,
  hasNext: true,
  hasPrev: true,
  loadContent: vi.fn(),
  setFilteredIds: vi.fn(),
  next: vi.fn(),
  prev: vi.fn(),
  saveContent: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn()
};

vi.mock('$lib/stores/editorStore', () => ({
  createEditorStore: () => mockEditor
}));

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => ({}))
}));

function makeContent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'content-1',
    project_id: 'proj-1',
    pipeline_run_id: null,
    title: 'Test Article Title',
    body: { html: '<p>Hello world this is a test article with some words</p>' },
    meta_description: 'A test meta description',
    tags: ['seo', 'ai', 'testing'],
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

describe('FeedEditor Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render EditorNavBar', async () => {
    const FeedEditor = (await import('./+page.svelte')).default;

    render(FeedEditor, { props: { data: { content: makeContent() } } });

    expect(screen.getByTestId('editor-nav-bar')).toBeInTheDocument();
  });

  it('should render editable title field with content title', async () => {
    const FeedEditor = (await import('./+page.svelte')).default;

    render(FeedEditor, { props: { data: { content: makeContent() } } });

    const titleInput = screen.getByTestId('editor-title-input') as HTMLInputElement;
    expect(titleInput).toBeInTheDocument();
    expect(titleInput.value).toBe('Test Article Title');
  });

  it('should render body editor', async () => {
    const FeedEditor = (await import('./+page.svelte')).default;

    render(FeedEditor, { props: { data: { content: makeContent() } } });

    expect(screen.getByTestId('editor-body')).toBeInTheDocument();
  });

  it('should render editable meta description', async () => {
    const FeedEditor = (await import('./+page.svelte')).default;

    render(FeedEditor, { props: { data: { content: makeContent() } } });

    const metaInput = screen.getByTestId('editor-meta-input') as HTMLTextAreaElement;
    expect(metaInput).toBeInTheDocument();
    expect(metaInput.value).toBe('A test meta description');
  });

  it('should render tags as removable badges', async () => {
    const FeedEditor = (await import('./+page.svelte')).default;

    render(FeedEditor, { props: { data: { content: makeContent() } } });

    expect(screen.getByTestId('editor-tags')).toBeInTheDocument();
    expect(screen.getByTestId('editor-tag-0')).toBeInTheDocument();
    expect(screen.getByTestId('editor-tag-1')).toBeInTheDocument();
    expect(screen.getByTestId('editor-tag-2')).toBeInTheDocument();
  });

  it('should show read-only context with content type and status', async () => {
    const FeedEditor = (await import('./+page.svelte')).default;

    render(FeedEditor, { props: { data: { content: makeContent() } } });

    const context = screen.getByTestId('editor-context');
    expect(context).toBeInTheDocument();
    expect(context.textContent).toContain('article');
    expect(context.textContent).toContain('in_review');
  });

  it('should show word count', async () => {
    const FeedEditor = (await import('./+page.svelte')).default;

    render(FeedEditor, { props: { data: { content: makeContent() } } });

    expect(screen.getByTestId('editor-word-count')).toBeInTheDocument();
  });

  it('should render action buttons', async () => {
    const FeedEditor = (await import('./+page.svelte')).default;

    render(FeedEditor, { props: { data: { content: makeContent() } } });

    expect(screen.getByTestId('editor-reject-btn')).toBeInTheDocument();
    expect(screen.getByTestId('editor-save-btn')).toBeInTheDocument();
    expect(screen.getByTestId('editor-approve-btn')).toBeInTheDocument();
  });

  it('should render SocialPostEditor for social_post content type', async () => {
    const socialContent = makeContent({
      content_type: 'social_post',
      body: { html: 'Check out our new product!', platform: 'linkedin' }
    });

    const FeedEditor = (await import('./+page.svelte')).default;

    render(FeedEditor, { props: { data: { content: socialContent } } });

    expect(screen.getByTestId('social-editor-textarea')).toBeInTheDocument();
  });

  it('should render LandingPageEditor for landing_page content type', async () => {
    const landingContent = makeContent({
      content_type: 'landing_page',
      body: {
        html: '',
        slug: '/my-landing-page',
        sections: [
          { id: 's1', type: 'header', label: 'Header', content: 'Welcome' }
        ]
      }
    });

    const FeedEditor = (await import('./+page.svelte')).default;

    render(FeedEditor, { props: { data: { content: landingContent } } });

    expect(screen.getByTestId('landing-slug')).toBeInTheDocument();
  });
});
