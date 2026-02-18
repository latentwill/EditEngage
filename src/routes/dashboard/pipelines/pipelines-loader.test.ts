/**
 * @behavior Pipelines list loader fetches all pipelines for the active project
 * @business_rule Users see only pipelines belonging to their active project;
 * if no active project exists, the loader returns an empty array
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment variables
vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

const mockPipelinesData = [
  {
    id: 'pipe-1',
    project_id: 'proj-1',
    name: 'SEO Writer',
    description: 'Generates SEO articles',
    schedule: '0 6 * * *',
    review_mode: 'draft_for_review',
    is_active: true,
    steps: [{ agentType: 'researcher', config: {} }],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-10T00:00:00Z',
    last_run_at: '2025-01-10T10:00:00Z'
  },
  {
    id: 'pipe-2',
    project_id: 'proj-1',
    name: 'Social Posts',
    description: 'Creates social media content',
    schedule: null,
    review_mode: 'auto_publish',
    is_active: false,
    steps: [{ agentType: 'social-writer', config: {} }],
    created_at: '2025-01-02T00:00:00Z',
    updated_at: '2025-01-09T00:00:00Z',
    last_run_at: null
  }
];

// Build a chainable mock for supabase queries
function createMockSupabaseClient(returnData: unknown[] | null = null) {
  const mockOrder = vi.fn().mockResolvedValue({ data: returnData, error: null });
  const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

  return {
    client: { from: mockFrom },
    from: mockFrom,
    select: mockSelect,
    eq: mockEq,
    order: mockOrder
  };
}

let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase.client)
}));

describe('Pipelines List Loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load pipelines for active project', async () => {
    mockSupabase = createMockSupabaseClient(mockPipelinesData);

    const { load } = await import('./+page.server');

    const result = await load({
      parent: async () => ({
        projects: [{ id: 'proj-1', name: 'My Project' }],
        session: { user: { id: 'user-1', email: 'test@example.com' } }
      }),
      cookies: {} as never
    } as never);

    // Verify it queried the pipelines table
    expect(mockSupabase.from).toHaveBeenCalledWith('pipelines');
    expect(mockSupabase.select).toHaveBeenCalledWith('*');
    expect(mockSupabase.eq).toHaveBeenCalledWith('project_id', 'proj-1');
    expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });

    // Verify the returned data
    expect(result).toEqual({ pipelines: mockPipelinesData });
  });

  it('should return empty array when no active project', async () => {
    mockSupabase = createMockSupabaseClient(null);

    const { load } = await import('./+page.server');

    const result = await load({
      parent: async () => ({
        projects: [],
        session: { user: { id: 'user-1', email: 'test@example.com' } }
      }),
      cookies: {} as never
    } as never);

    // Should NOT query supabase when there's no project
    expect(mockSupabase.from).not.toHaveBeenCalled();

    // Should return empty pipelines array
    expect(result).toEqual({ pipelines: [] });
  });
});
