/**
 * @behavior Programmatic template detail loader fetches a single template by ID or returns create mode
 * @business_rule Users can create new templates (mode='create') or edit existing ones (mode='edit');
 * a 404 is thrown if the template does not exist
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

const mockTemplate = {
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
};

// Chainable mock for template query (with .single())
function createTemplateQueryMock(returnData: unknown, returnError: unknown = null) {
  const mockSingle = vi.fn().mockResolvedValue({ data: returnData, error: returnError });
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  return { select: mockSelect, eq: mockEq, single: mockSingle };
}

let templateQuery: ReturnType<typeof createTemplateQueryMock>;
let mockGetUser: ReturnType<typeof vi.fn>;

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'templates') return { select: templateQuery.select };
      return { select: vi.fn() };
    }),
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args)
    }
  }))
}));

describe('Programmatic Template Detail Loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    });
  });

  it('should return create mode for new ID', async () => {
    templateQuery = createTemplateQueryMock(null);

    const { load } = await import('./[id]/+page.server');

    const result = await load({
      params: { id: 'new' },
      cookies: {} as never
    } as never);

    // Should return create mode without querying
    expect(result).toEqual({ template: null, mode: 'create' });

    // Should NOT query the database
    expect(templateQuery.select).not.toHaveBeenCalled();
  });

  it('should load template by ID for edit mode', async () => {
    templateQuery = createTemplateQueryMock(mockTemplate);

    const { load } = await import('./[id]/+page.server');

    const result = await load({
      params: { id: 'tmpl-1' },
      cookies: {} as never
    } as never);

    // Verify template query
    expect(templateQuery.select).toHaveBeenCalledWith('*');
    expect(templateQuery.eq).toHaveBeenCalledWith('id', 'tmpl-1');
    expect(templateQuery.single).toHaveBeenCalled();

    // Verify returned data
    expect(result).toEqual({
      template: mockTemplate,
      mode: 'edit'
    });
  });

  it('should throw 404 for non-existent template', async () => {
    templateQuery = createTemplateQueryMock(null, { code: 'PGRST116', message: 'not found' });

    const { load } = await import('./[id]/+page.server');

    await expect(
      load({
        params: { id: 'nonexistent' },
        cookies: {} as never
      } as never)
    ).rejects.toThrow();
  });
});
