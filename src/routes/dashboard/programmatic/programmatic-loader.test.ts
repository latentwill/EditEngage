/**
 * @behavior Programmatic templates loader fetches all templates for the active project
 * @business_rule Users see only templates belonging to their active project;
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

const mockTemplatesData = [
  {
    id: 'tmpl-1',
    project_id: 'proj-1',
    name: 'City Landing Pages',
    slug_pattern: '/best-{service}-in-{city}',
    body_template: '<h1>Best {service} in {city}</h1><p>{description}</p>',
    variables: ['service', 'city', 'description'],
    data_source: {
      columns: ['service', 'city', 'description'],
      row_count: 150
    },
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z'
  },
  {
    id: 'tmpl-2',
    project_id: 'proj-1',
    name: 'Product Comparison Pages',
    slug_pattern: '/{product}-vs-{competitor}',
    body_template: '<h1>{product} vs {competitor}</h1><p>{comparison_text}</p>',
    variables: ['product', 'competitor', 'comparison_text'],
    data_source: {
      columns: ['product', 'competitor', 'comparison_text'],
      row_count: 45
    },
    created_at: '2026-01-20T14:00:00Z',
    updated_at: '2026-01-20T14:00:00Z'
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

describe('Programmatic Templates Loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load templates for active project', async () => {
    mockSupabase = createMockSupabaseClient(mockTemplatesData);

    const { load } = await import('./+page.server');

    const result = await load({
      parent: async () => ({
        projects: [{ id: 'proj-1', name: 'My Project' }],
        session: { user: { id: 'user-1', email: 'test@example.com' } }
      }),
      cookies: {} as never
    } as never);

    // Verify it queried the templates table
    expect(mockSupabase.from).toHaveBeenCalledWith('templates');
    expect(mockSupabase.select).toHaveBeenCalledWith('*');
    expect(mockSupabase.eq).toHaveBeenCalledWith('project_id', 'proj-1');
    expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });

    // Verify the returned data
    expect(result).toEqual({ templates: mockTemplatesData });
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

    // Should return empty templates array
    expect(result).toEqual({ templates: [] });
  });
});
