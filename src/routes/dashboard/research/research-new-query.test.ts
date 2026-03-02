/**
 * @behavior Clicking "New Query" toggles an inline form for creating a research query
 * @business_rule Users can create new research queries directly from the research page
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

const mockLoadQueries = vi.fn();
const mockRunQuery = vi.fn();

const mockResearchStore = {
  queries: [] as Array<{
    id: string;
    name: string;
    status: string;
    provider_chain: Array<{ provider: string; role: string }>;
    schedule: string | null;
    last_run_at: string | null;
    brief_count: number;
    pipeline_name: string | null;
  }>,
  loading: false,
  searchTerm: '',
  providerFilter: null as string | null,
  loadQueries: mockLoadQueries,
  searchQueries: vi.fn(),
  filterByProvider: vi.fn(),
  runQuery: mockRunQuery,
};

vi.mock('$lib/stores/researchStore', () => ({
  createResearchStore: () => mockResearchStore
}));

vi.mock('$lib/stores/projectStore', () => ({
  createProjectStore: () => ({
    selectedProjectId: 'proj-1',
    projects: [{ id: 'proj-1', name: 'Test Project' }],
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

describe('Research Page - New Query Form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResearchStore.queries = [];
    mockResearchStore.loading = false;
    mockResearchStore.searchTerm = '';
    mockResearchStore.providerFilter = null;
    // Reset fetch mock
    vi.stubGlobal('fetch', vi.fn());
  });

  it('does not show the new query form initially', async () => {
    const ResearchPage = (await import('./+page.svelte')).default;
    render(ResearchPage);

    expect(screen.queryByTestId('new-query-form')).not.toBeInTheDocument();
  });

  it('shows the new query form when "New Query" button is clicked', async () => {
    const ResearchPage = (await import('./+page.svelte')).default;
    render(ResearchPage);

    await fireEvent.click(screen.getByTestId('new-query-btn'));

    expect(screen.getByTestId('new-query-form')).toBeInTheDocument();
    expect(screen.getByTestId('new-query-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('new-query-save-btn')).toBeInTheDocument();
  });

  it('hides the new query form when cancel is clicked', async () => {
    const ResearchPage = (await import('./+page.svelte')).default;
    render(ResearchPage);

    await fireEvent.click(screen.getByTestId('new-query-btn'));
    expect(screen.getByTestId('new-query-form')).toBeInTheDocument();

    await fireEvent.click(screen.getByTestId('new-query-cancel-btn'));
    expect(screen.queryByTestId('new-query-form')).not.toBeInTheDocument();
  });

  it('calls fetch POST to create a research query on save', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'new-query-1', name: 'My New Query' } })
    });
    vi.stubGlobal('fetch', mockFetch);

    const ResearchPage = (await import('./+page.svelte')).default;
    render(ResearchPage);

    await fireEvent.click(screen.getByTestId('new-query-btn'));

    const nameInput = screen.getByTestId('new-query-name-input');
    await fireEvent.input(nameInput, { target: { value: 'My New Query' } });

    await fireEvent.click(screen.getByTestId('new-query-save-btn'));

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/research',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('My New Query')
      })
    );
  });

  it('reloads queries and hides form after successful save', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'new-query-1', name: 'My New Query' } })
    });
    vi.stubGlobal('fetch', mockFetch);

    const ResearchPage = (await import('./+page.svelte')).default;
    render(ResearchPage);

    await fireEvent.click(screen.getByTestId('new-query-btn'));

    const nameInput = screen.getByTestId('new-query-name-input');
    await fireEvent.input(nameInput, { target: { value: 'My New Query' } });

    await fireEvent.click(screen.getByTestId('new-query-save-btn'));

    // Wait for async operations
    await vi.waitFor(() => {
      expect(mockLoadQueries).toHaveBeenCalledTimes(2); // once on mount, once after save
    });

    expect(screen.queryByTestId('new-query-form')).not.toBeInTheDocument();
  });
});
