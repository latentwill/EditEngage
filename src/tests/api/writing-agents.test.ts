/**
 * @behavior The writing-agents GET endpoint returns writing agents scoped
 * to the authenticated user's project, with optional project_id filtering.
 * @business_rule Only authenticated users can access writing agents.
 * When project_id is provided, agents are filtered by that project directly.
 * When omitted, the first project is used as a fallback.
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
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(terminalValue);
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(terminalValue));
  return chain;
}

let mockAuthUser: { id: string } | null = { id: 'user-1' };
let mockProjectChain: ReturnType<typeof createChainMock>;
let mockAgentsChain: ReturnType<typeof createChainMock>;

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({
      data: { user: mockAuthUser },
      error: mockAuthUser ? null : { message: 'Not authenticated' }
    }))
  },
  from: vi.fn((table: string) => {
    if (table === 'projects') {
      return mockProjectChain;
    }
    if (table === 'writing_agents') {
      return mockAgentsChain;
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

describe('GET /api/v1/writing-agents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockProjectChain = createChainMock({
      data: { id: 'proj-1' },
      error: null
    });
    mockAgentsChain = createChainMock({
      data: [
        { id: 'agent-1', project_id: 'proj-1', name: 'Blog Writer', model: 'openai/gpt-4o', is_active: true },
        { id: 'agent-2', project_id: 'proj-1', name: 'SEO Writer', model: 'anthropic/claude-sonnet-4-6', is_active: true }
      ],
      error: null
    });
  });

  it('should return writing agents for the user project', async () => {
    const { GET } = await import('../../routes/api/v1/writing-agents/+server.js');

    const url = new URL('http://localhost/api/v1/writing-agents');
    const response = await GET({
      cookies: makeCookies(),
      url
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].name).toBe('Blog Writer');
    expect(mockSupabase.from).toHaveBeenCalledWith('writing_agents');
  });

  it('should filter by project_id when provided as query param', async () => {
    const { GET } = await import('../../routes/api/v1/writing-agents/+server.js');

    const url = new URL('http://localhost/api/v1/writing-agents?project_id=proj-99');
    const response = await GET({
      cookies: makeCookies(),
      url
    } as never);

    expect(response.status).toBe(200);
    // When project_id is provided, it should use it directly instead of querying projects table
    expect(mockAgentsChain.eq).toHaveBeenCalledWith('project_id', 'proj-99');
  });

  it('should return empty array when no agents exist', async () => {
    mockAgentsChain = createChainMock({
      data: [],
      error: null
    });

    const { GET } = await import('../../routes/api/v1/writing-agents/+server.js');

    const url = new URL('http://localhost/api/v1/writing-agents');
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

    const { GET } = await import('../../routes/api/v1/writing-agents/+server.js');

    const url = new URL('http://localhost/api/v1/writing-agents');
    const response = await GET({
      cookies: makeCookies(),
      url
    } as never);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });
});
