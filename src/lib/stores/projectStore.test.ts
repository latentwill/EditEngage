/**
 * @behavior Project selector store loads projects for user's organizations,
 * supports favorites sorting, favorite toggling, project selection with URL
 * persistence, default "All Projects" mode, and search filtering
 * @business_rule Users see all projects across their organizations, with
 * favorites pinned to the top; "All Projects" is the default when no
 * default_project preference is set; selection persists in URL ?project= param
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

// --- Test Data ---

const projectExtndly = {
  id: 'proj-1',
  org_id: 'org-1',
  name: 'Extndly',
  description: 'AI agency',
  icon: null,
  color: '#3B82F6',
  domain: 'extndly.com',
  settings: {},
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z'
};

const projectBiron = {
  id: 'proj-2',
  org_id: 'org-1',
  name: 'Biron',
  description: 'Blog',
  icon: null,
  color: '#EF4444',
  domain: 'biron.co',
  settings: {},
  created_at: '2025-01-02T00:00:00Z',
  updated_at: '2025-01-02T00:00:00Z'
};

const projectKinamix = {
  id: 'proj-3',
  org_id: 'org-2',
  name: 'Kinamix',
  description: 'Consultancy',
  icon: null,
  color: '#10B981',
  domain: 'kinamix.com',
  settings: {},
  created_at: '2025-01-03T00:00:00Z',
  updated_at: '2025-01-03T00:00:00Z'
};

const allProjects = [projectExtndly, projectBiron, projectKinamix];

// --- Mock Setup ---

function createMockSupabaseClient(options: {
  projects?: typeof allProjects;
  userPreferences?: { favorite_projects: string[]; default_project: string | null } | null;
  updateError?: { message: string } | null;
}) {
  const {
    projects = allProjects,
    userPreferences = { favorite_projects: [], default_project: null },
    updateError = null
  } = options;

  // Track the table being queried so .select() returns correct data
  let currentTable = '';

  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: null, error: updateError })
  });

  const mockClient = {
    from: vi.fn((table: string) => {
      currentTable = table;
      return {
        select: vi.fn(() => {
          if (currentTable === 'projects') {
            return {
              in: vi.fn().mockResolvedValue({ data: projects, error: null })
            };
          }
          if (currentTable === 'organization_members') {
            // Return unique org IDs from the projects
            const orgIds = [...new Set(projects.map(p => p.org_id))];
            return Promise.resolve({
              data: orgIds.map(orgId => ({ org_id: orgId })),
              error: null
            });
          }
          if (currentTable === 'user_preferences') {
            return {
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: userPreferences,
                  error: userPreferences ? null : { code: 'PGRST116', message: 'not found' }
                })
              })
            };
          }
          return { in: vi.fn().mockResolvedValue({ data: [], error: null }) };
        }),
        update: mockUpdate
      };
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      })
    }
  };

  return { mockClient, mockUpdate };
}

// Store URL search params state for test
let mockSearchParams: URLSearchParams;

function createMockUrl() {
  mockSearchParams = new URLSearchParams();
  return {
    get searchParams() { return mockSearchParams; },
    set searchParams(val: URLSearchParams) { mockSearchParams = val; }
  };
}

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn()
}));

describe('projectStore', () => {
  let mockUrl: ReturnType<typeof createMockUrl>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    mockUrl = createMockUrl();

    // Mock window.history.replaceState for URL param persistence
    vi.stubGlobal('window', {
      ...globalThis.window,
      location: { href: 'http://localhost/', search: '' },
      history: { replaceState: vi.fn() }
    });
  });

  it('should fetch all projects for user\'s organizations', async () => {
    const { mockClient } = createMockSupabaseClient({ projects: allProjects });

    const { createSupabaseClient } = await import('$lib/supabase');
    vi.mocked(createSupabaseClient).mockReturnValue(mockClient as ReturnType<typeof createSupabaseClient>);

    const { createProjectStore, resetProjectStore } = await import('./projectStore.js');
    resetProjectStore();
    const store = createProjectStore();

    await store.loadProjects();

    expect(store.projects).toHaveLength(3);
    expect(store.projects.map(p => p.id)).toEqual(['proj-1', 'proj-2', 'proj-3']);
    expect(mockClient.from).toHaveBeenCalledWith('organization_members');
    expect(mockClient.from).toHaveBeenCalledWith('projects');
  });

  it('should return favorite projects sorted first', async () => {
    const { mockClient } = createMockSupabaseClient({
      projects: allProjects,
      userPreferences: { favorite_projects: ['proj-2'], default_project: null }
    });

    const { createSupabaseClient } = await import('$lib/supabase');
    vi.mocked(createSupabaseClient).mockReturnValue(mockClient as ReturnType<typeof createSupabaseClient>);

    const { createProjectStore, resetProjectStore } = await import('./projectStore.js');
    resetProjectStore();
    const store = createProjectStore();

    await store.loadProjects();

    // Biron (proj-2) is favorited so it should be first
    expect(store.projects[0].id).toBe('proj-2');
    expect(store.favoriteProjectIds).toContain('proj-2');
  });

  it('should persist favorite toggle to user_preferences', async () => {
    const { mockClient, mockUpdate } = createMockSupabaseClient({
      projects: allProjects,
      userPreferences: { favorite_projects: [], default_project: null }
    });

    const { createSupabaseClient } = await import('$lib/supabase');
    vi.mocked(createSupabaseClient).mockReturnValue(mockClient as ReturnType<typeof createSupabaseClient>);

    const { createProjectStore, resetProjectStore } = await import('./projectStore.js');
    resetProjectStore();
    const store = createProjectStore();

    await store.loadProjects();
    await store.toggleFavorite('proj-1');

    expect(mockClient.from).toHaveBeenCalledWith('user_preferences');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        favorite_projects: expect.arrayContaining(['proj-1'])
      })
    );
  });

  it('should persist selected project to URL param', async () => {
    const { mockClient } = createMockSupabaseClient({ projects: allProjects });

    const { createSupabaseClient } = await import('$lib/supabase');
    vi.mocked(createSupabaseClient).mockReturnValue(mockClient as ReturnType<typeof createSupabaseClient>);

    const { createProjectStore, resetProjectStore } = await import('./projectStore.js');
    resetProjectStore();
    const store = createProjectStore();

    await store.loadProjects();
    store.selectProject('proj-1');

    expect(store.selectedProjectId).toBe('proj-1');
    expect(window.history.replaceState).toHaveBeenCalledWith(
      {},
      '',
      expect.stringContaining('project=proj-1')
    );
  });

  it('should default to "All Projects" when no default_project set', async () => {
    const { mockClient } = createMockSupabaseClient({
      projects: allProjects,
      userPreferences: { favorite_projects: [], default_project: null }
    });

    const { createSupabaseClient } = await import('$lib/supabase');
    vi.mocked(createSupabaseClient).mockReturnValue(mockClient as ReturnType<typeof createSupabaseClient>);

    const { createProjectStore, resetProjectStore } = await import('./projectStore.js');
    resetProjectStore();
    const store = createProjectStore();

    await store.loadProjects();

    expect(store.selectedProjectId).toBe('all');
  });

  it('should filter projects by search term (name or domain)', async () => {
    const { mockClient } = createMockSupabaseClient({ projects: allProjects });

    const { createSupabaseClient } = await import('$lib/supabase');
    vi.mocked(createSupabaseClient).mockReturnValue(mockClient as ReturnType<typeof createSupabaseClient>);

    const { createProjectStore, resetProjectStore } = await import('./projectStore.js');
    resetProjectStore();
    const store = createProjectStore();

    await store.loadProjects();

    const results = store.searchProjects('ext');

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Extndly');
  });
});
