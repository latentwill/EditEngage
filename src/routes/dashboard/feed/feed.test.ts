/**
 * @behavior FeedView renders a feed page with filter bar, content cards, loading states, and infinite scroll
 * @business_rule Users review content in a scrollable feed with filtering by status/pipeline/type
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

const mockFeedStore = {
  items: [] as Array<{
    id: string;
    title: string;
    body: { html: string; text?: string };
    tags: string[];
    status: string;
    content_type: string;
    created_at: string;
    projects: { name: string; color: string | null } | null;
  }>,
  loading: false,
  hasMore: false,
  filters: {},
  loadFeed: vi.fn(),
  loadMore: vi.fn(),
  approveContent: vi.fn(),
  rejectContent: vi.fn(),
  setFilters: vi.fn()
};

vi.mock('$lib/stores/feedStore', () => ({
  createFeedStore: () => mockFeedStore
}));

vi.mock('$lib/stores/projectStore', () => ({
  createProjectStore: () => ({
    selectedProjectId: 'all',
    projects: [],
    favoriteProjectIds: [],
    loadProjects: vi.fn(),
    toggleFavorite: vi.fn(),
    selectProject: vi.fn(),
    searchProjects: vi.fn().mockReturnValue([])
  })
}));

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => ({}))
}));

describe('FeedView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFeedStore.items = [];
    mockFeedStore.loading = false;
    mockFeedStore.hasMore = false;
    mockFeedStore.filters = {};
  });

  it('should render FeedFilterBar at the top', async () => {
    const FeedPage = (await import('./+page.svelte')).default;

    render(FeedPage);

    expect(screen.getByTestId('feed-page')).toBeInTheDocument();
    expect(screen.getByTestId('feed-filter-bar')).toBeInTheDocument();
  });

  it('should render FeedCards for each content item', async () => {
    mockFeedStore.items = [
      {
        id: 'c1',
        title: 'Article One',
        body: { html: '<p>Body one</p>' },
        tags: ['seo'],
        status: 'draft',
        content_type: 'article',
        created_at: new Date().toISOString(),
        projects: { name: 'Project A', color: '#ff0000' }
      },
      {
        id: 'c2',
        title: 'Article Two',
        body: { html: '<p>Body two</p>' },
        tags: ['ai'],
        status: 'in_review',
        content_type: 'article',
        created_at: new Date().toISOString(),
        projects: { name: 'Project B', color: '#00ff00' }
      },
      {
        id: 'c3',
        title: 'Article Three',
        body: { html: '<p>Body three</p>' },
        tags: ['tech'],
        status: 'draft',
        content_type: 'social_post',
        created_at: new Date().toISOString(),
        projects: { name: 'Project C', color: '#0000ff' }
      }
    ];

    const FeedPage = (await import('./+page.svelte')).default;

    render(FeedPage);

    const cards = screen.getAllByTestId('feed-card');
    expect(cards).toHaveLength(3);
  });

  it('should show loading skeleton while fetching', async () => {
    mockFeedStore.loading = true;

    const FeedPage = (await import('./+page.svelte')).default;

    render(FeedPage);

    expect(screen.getByTestId('feed-loading')).toBeInTheDocument();
  });

  it('should show empty state when no content matches filters', async () => {
    mockFeedStore.items = [];
    mockFeedStore.loading = false;

    const FeedPage = (await import('./+page.svelte')).default;

    render(FeedPage);

    expect(screen.getByTestId('feed-empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('feed-empty-state').textContent).toContain('No content matches');
  });

  it('should call loadMore when scroll reaches bottom', async () => {
    mockFeedStore.items = [
      {
        id: 'c1',
        title: 'Article One',
        body: { html: '<p>Body</p>' },
        tags: [],
        status: 'draft',
        content_type: 'article',
        created_at: new Date().toISOString(),
        projects: null
      }
    ];
    mockFeedStore.hasMore = true;

    // Capture the IntersectionObserver callback
    let observerCallback: IntersectionObserverCallback;
    const mockObserve = vi.fn();
    const mockDisconnect = vi.fn();

    vi.stubGlobal('IntersectionObserver', vi.fn((callback: IntersectionObserverCallback) => {
      observerCallback = callback;
      return {
        observe: mockObserve,
        disconnect: mockDisconnect,
        unobserve: vi.fn()
      };
    }));

    const FeedPage = (await import('./+page.svelte')).default;

    render(FeedPage);

    // Simulate intersection (sentinel becomes visible)
    observerCallback!(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );

    expect(mockFeedStore.loadMore).toHaveBeenCalled();
  });

  it('should pass showProjectBadge=true when selectedProjectId is all', async () => {
    // projectStore mock already has selectedProjectId: 'all'
    mockFeedStore.items = [
      {
        id: 'c1',
        title: 'Article One',
        body: { html: '<p>Body</p>' },
        tags: [],
        status: 'draft',
        content_type: 'article',
        created_at: new Date().toISOString(),
        projects: { name: 'Project A', color: '#ff0000' }
      }
    ];

    const FeedPage = (await import('./+page.svelte')).default;

    render(FeedPage);

    // When showProjectBadge is true and project data exists, ProjectBadge renders
    expect(screen.getByTestId('project-badge')).toBeInTheDocument();
  });
});
