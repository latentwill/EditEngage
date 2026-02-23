/**
 * @behavior Research page displays research queries with search, filter, and create actions
 * @business_rule Users manage automated research queries scoped to their projects
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

interface MockQuery {
  id: string;
  name: string;
  status: string;
  provider_chain: Array<{ provider: string; role: string }>;
  schedule: string | null;
  last_run_at: string | null;
  brief_count: number;
  pipeline_name: string | null;
}

const mockResearchStore = {
  queries: [] as MockQuery[],
  loading: false,
  searchTerm: '',
  providerFilter: null as string | null,
  loadQueries: vi.fn(),
  searchQueries: vi.fn(),
  filterByProvider: vi.fn(),
  runQuery: vi.fn(),
};

vi.mock('$lib/stores/researchStore', () => ({
  createResearchStore: () => mockResearchStore
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


function makeMockQuery(overrides: Partial<MockQuery> & { id: string; name: string }): MockQuery {
  return {
    id: overrides.id,
    name: overrides.name,
    status: overrides.status ?? 'active',
    provider_chain: overrides.provider_chain ?? [{ provider: 'perplexity', role: 'discovery' }],
    schedule: overrides.schedule ?? null,
    last_run_at: overrides.last_run_at ?? null,
    brief_count: overrides.brief_count ?? 0,
    pipeline_name: overrides.pipeline_name ?? null,
  };
}

describe('Research Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResearchStore.queries = [];
    mockResearchStore.loading = false;
    mockResearchStore.searchTerm = '';
    mockResearchStore.providerFilter = null;
  });

  it('should render Research heading and + New Query button', async () => {
    const ResearchPage = (await import('./+page.svelte')).default;
    render(ResearchPage);

    expect(screen.getByTestId('research-heading')).toBeInTheDocument();
    expect(screen.getByTestId('research-heading').textContent).toContain('Research');
    expect(screen.getByTestId('new-query-btn')).toBeInTheDocument();
  });

  it('should render ResearchQueryCard for each query', async () => {
    mockResearchStore.queries = [
      makeMockQuery({ id: 'q-1', name: 'SEO Research' }),
      makeMockQuery({ id: 'q-2', name: 'Competitor Analysis' }),
    ];

    const ResearchPage = (await import('./+page.svelte')).default;
    render(ResearchPage);

    const cards = screen.getAllByTestId('research-query-card');
    expect(cards).toHaveLength(2);
  });

  it('should show empty state when no queries', async () => {
    mockResearchStore.queries = [];
    mockResearchStore.loading = false;

    const ResearchPage = (await import('./+page.svelte')).default;
    render(ResearchPage);

    expect(screen.getByTestId('research-empty-state')).toBeInTheDocument();
  });

  it('should render search input and provider filter', async () => {
    const ResearchPage = (await import('./+page.svelte')).default;
    render(ResearchPage);

    expect(screen.getByTestId('research-search-input')).toBeInTheDocument();
    expect(screen.getByTestId('research-provider-filter')).toBeInTheDocument();
  });

  it('should show loading state', async () => {
    mockResearchStore.loading = true;

    const ResearchPage = (await import('./+page.svelte')).default;
    render(ResearchPage);

    expect(screen.getByTestId('research-loading')).toBeInTheDocument();
  });
});
