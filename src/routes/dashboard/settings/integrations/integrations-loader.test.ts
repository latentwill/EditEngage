/**
 * @behavior Integrations page loader fetches api_keys and destinations for the active project
 * @business_rule Users see their project's API keys and publishing destinations loaded from the database
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

const mockSelect = vi.fn();
const mockEq = vi.fn();

const mockSupabase = {
  from: vi.fn(() => ({
    select: mockSelect
  }))
};

mockSelect.mockReturnValue({ eq: mockEq });

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
  createServiceRoleClient: vi.fn()
}));

describe('Integrations Page Loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
  });

  it('returns empty arrays when no active project', async () => {
    const { load } = await import('./+page.server');

    const result = await load({
      parent: vi.fn().mockResolvedValue({ projects: [] }),
      cookies: {} as never
    } as never);

    expect(result).toEqual({
      projectId: '',
      apiKeys: [],
      destinations: []
    });
  });

  it('fetches api_keys and destinations for the active project', async () => {
    const mockApiKeys = [
      { id: 'key-1', provider: 'openrouter', api_key: 'sk-***', project_id: 'proj-1', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' }
    ];
    const mockDestinations = [
      { id: 'dest-1', type: 'ghost', name: 'My Blog', project_id: 'proj-1', config: {}, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' }
    ];

    // First call: api_keys, second call: destinations
    mockEq
      .mockResolvedValueOnce({ data: mockApiKeys })
      .mockResolvedValueOnce({ data: mockDestinations });

    const { load } = await import('./+page.server');

    const result = await load({
      parent: vi.fn().mockResolvedValue({ projects: [{ id: 'proj-1' }] }),
      cookies: {} as never
    } as never);

    expect(mockSupabase.from).toHaveBeenCalledWith('api_keys');
    expect(mockSupabase.from).toHaveBeenCalledWith('destinations');
    expect(result).toEqual({
      projectId: 'proj-1',
      apiKeys: mockApiKeys,
      destinations: mockDestinations
    });
  });

  it('returns empty arrays when queries return null data', async () => {
    mockEq
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: null });

    const { load } = await import('./+page.server');

    const result = await load({
      parent: vi.fn().mockResolvedValue({ projects: [{ id: 'proj-1' }] }),
      cookies: {} as never
    } as never);

    expect(result).toEqual({
      projectId: 'proj-1',
      apiKeys: [],
      destinations: []
    });
  });
});
