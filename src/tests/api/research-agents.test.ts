/**
 * @behavior The research collection endpoint returns research queries
 * scoped to a project, filtered by project_id query parameter.
 * @business_rule Only authenticated users can access research queries.
 * A project_id query parameter is used to scope results.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment variables
vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

// --- Supabase mock builder ---

function createChainMock(terminalValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(terminalValue);
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(terminalValue));
  return chain;
}

let mockAuthUser: { id: string } | null = { id: 'user-1' };
let mockMembershipsChain: ReturnType<typeof createChainMock>;
let mockProjectsChain: ReturnType<typeof createChainMock>;
let mockResearchChain: ReturnType<typeof createChainMock>;

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({
      data: { user: mockAuthUser },
      error: mockAuthUser ? null : { message: 'Not authenticated' }
    }))
  },
  from: vi.fn((table: string) => {
    if (table === 'organization_members') {
      return mockMembershipsChain;
    }
    if (table === 'projects') {
      return mockProjectsChain;
    }
    if (table === 'research_queries') {
      return mockResearchChain;
    }
    return createChainMock({ data: null, error: null });
  })
};

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
  createServiceRoleClient: vi.fn(() => mockSupabase)
}));

// --- Helpers ---

function makeCookies() {
  return {
    getAll: vi.fn(() => []),
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    serialize: vi.fn()
  };
}

describe('GET /api/v1/research', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };

    // Mock organization_members query for getUserProjects
    mockMembershipsChain = createChainMock({
      data: [{ org_id: 'org-1' }],
      error: null
    });

    // Mock projects query for getUserProjects
    mockProjectsChain = createChainMock({
      data: [{ id: 'proj-1', org_id: 'org-1' }],
      error: null
    });

    // Mock research_queries query
    mockResearchChain = createChainMock({
      data: [
        { id: 'rq-1', name: 'SEO Research', status: 'completed', provider_chain: ['perplexity'] },
        { id: 'rq-2', name: 'Competitor Analysis', status: 'pending', provider_chain: ['tavily'] }
      ],
      error: null
    });
  });

  it('should return research queries for the project', async () => {
    const { GET } = await import('../../routes/api/v1/research/+server.js');

    const url = new URL('http://localhost/api/v1/research?project_id=proj-1');
    const response = await GET({
      cookies: makeCookies(),
      url
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].name).toBe('SEO Research');
    expect(mockSupabase.from).toHaveBeenCalledWith('research_queries');
    expect(mockResearchChain.eq).toHaveBeenCalledWith('project_id', 'proj-1');
  });

  it('should return empty array when none exist', async () => {
    // Keep memberships and projects setup, only change research chain
    mockResearchChain.then = vi.fn((resolve: (v: unknown) => void) =>
      resolve({ data: [], error: null })
    );

    const { GET } = await import('../../routes/api/v1/research/+server.js');

    const url = new URL('http://localhost/api/v1/research?project_id=proj-1');
    const response = await GET({
      cookies: makeCookies(),
      url
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual([]);
  });

  it('should reject unauthenticated requests', async () => {
    mockAuthUser = null;

    const { GET } = await import('../../routes/api/v1/research/+server.js');

    const url = new URL('http://localhost/api/v1/research?project_id=proj-1');
    const response = await GET({
      cookies: makeCookies(),
      url
    } as never);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });
});
