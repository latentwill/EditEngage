/**
 * @behavior Feed page calls loadFeed on mount to populate the content feed
 * @business_rule Users see their content feed immediately when navigating to the feed page
 */
import { render } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

const mockLoadFeed = vi.fn();

vi.mock('$lib/stores/feedStore', () => ({
  createFeedStore: vi.fn(() => ({
    items: [],
    loading: false,
    hasMore: false,
    filters: {},
    loadFeed: mockLoadFeed,
    loadMore: vi.fn(),
    approveContent: vi.fn(),
    rejectContent: vi.fn(),
    setFilters: vi.fn()
  }))
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

describe('Feed Page - onMount loadFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls feedStore.loadFeed() when the component mounts', async () => {
    const FeedPage = (await import('./+page.svelte')).default;

    render(FeedPage);

    expect(mockLoadFeed).toHaveBeenCalled();
  });
});
