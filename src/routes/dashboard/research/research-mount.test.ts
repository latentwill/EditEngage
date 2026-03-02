/**
 * @behavior Research page calls loadQueries on mount to populate the query list
 * @business_rule Users see their research queries immediately when navigating to the research page
 */
import { render } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

const mockLoadQueries = vi.fn();

vi.mock('$lib/stores/researchStore', () => ({
  createResearchStore: vi.fn(() => ({
    queries: [],
    loading: false,
    searchTerm: '',
    providerFilter: null,
    loadQueries: mockLoadQueries,
    searchQueries: vi.fn(),
    filterByProvider: vi.fn(),
    runQuery: vi.fn()
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

describe('Research Page - onMount loadQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls researchStore.loadQueries() when the component mounts', async () => {
    const ResearchPage = (await import('./+page.svelte')).default;

    render(ResearchPage);

    expect(mockLoadQueries).toHaveBeenCalled();
  });
});
