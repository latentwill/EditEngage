/**
 * @behavior Feed page loads pipelines from Supabase and passes them to FeedFilterBar
 * @business_rule Users can filter feed content by pipeline, requiring real pipeline
 * data to be fetched rather than hardcoded empty array
 */
import { render, screen, waitFor } from '@testing-library/svelte';
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

const mockSelectFn = vi.fn();
const mockProjectStore = {
  selectedProjectId: 'proj-1',
  projects: [],
  favoriteProjectIds: [],
  loadProjects: vi.fn(),
  toggleFavorite: vi.fn(),
  selectProject: mockSelectFn,
  searchProjects: vi.fn().mockReturnValue([])
};

vi.mock('$lib/stores/projectStore', () => ({
  createProjectStore: () => mockProjectStore
}));

const mockPipelines = [
  { id: 'pipe-1', name: 'SEO Writer' },
  { id: 'pipe-2', name: 'Social Posts' }
];

const mockSelectResult = {
  eq: vi.fn().mockResolvedValue({ data: mockPipelines, error: null })
};

const mockFrom = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue(mockSelectResult)
});

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => ({
    from: mockFrom
  }))
}));

describe('Feed Page Pipeline Loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFeedStore.items = [];
    mockFeedStore.loading = false;
    mockFeedStore.hasMore = false;
    mockProjectStore.selectedProjectId = 'proj-1';

    mockSelectResult.eq.mockResolvedValue({ data: mockPipelines, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue(mockSelectResult)
    });
  });

  it('fetches pipelines from Supabase on mount', async () => {
    const FeedPage = (await import('./+page.svelte')).default;
    render(FeedPage);

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('pipelines');
    });
  });

  it('passes fetched pipelines to FeedFilterBar', async () => {
    const FeedPage = (await import('./+page.svelte')).default;
    render(FeedPage);

    await waitFor(() => {
      const pipelineSelect = screen.getByTestId('filter-pipeline');
      expect(pipelineSelect).toBeInTheDocument();
    });

    // After loading, pipeline options should appear in the select
    await waitFor(() => {
      expect(screen.getByText('SEO Writer')).toBeInTheDocument();
      expect(screen.getByText('Social Posts')).toBeInTheDocument();
    });
  });

  it('passes empty array while loading pipelines', async () => {
    // Make the query never resolve immediately
    mockSelectResult.eq.mockReturnValue(new Promise(() => {}));
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue(mockSelectResult)
    });

    const FeedPage = (await import('./+page.svelte')).default;
    render(FeedPage);

    // The filter bar should still render (with empty pipelines)
    expect(screen.getByTestId('feed-filter-bar')).toBeInTheDocument();
    // No pipeline option text should exist yet
    expect(screen.queryByText('SEO Writer')).not.toBeInTheDocument();
  });

  it('filters pipelines by the active project id', async () => {
    mockProjectStore.selectedProjectId = 'proj-42';

    const FeedPage = (await import('./+page.svelte')).default;
    render(FeedPage);

    await waitFor(() => {
      expect(mockSelectResult.eq).toHaveBeenCalledWith('project_id', 'proj-42');
    });
  });
});
