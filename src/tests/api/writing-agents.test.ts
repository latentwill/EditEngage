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
  chain.in = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(terminalValue);
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(terminalValue));
  return chain;
}

let mockAuthUser: { id: string } | null = { id: 'user-1' };
let mockProjectChain: ReturnType<typeof createChainMock>;
let mockAgentsChain: ReturnType<typeof createChainMock>;
let mockMembershipsChain: ReturnType<typeof createChainMock>;

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
    if (table === 'organization_members') {
      return mockMembershipsChain;
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
      data: [{ id: 'proj-1', org_id: 'org-1' }],
      error: null
    });
    mockAgentsChain = createChainMock({
      data: [
        { id: 'agent-1', project_id: 'proj-1', name: 'Blog Writer', model: 'openai/gpt-4o', is_active: true },
        { id: 'agent-2', project_id: 'proj-1', name: 'SEO Writer', model: 'anthropic/claude-sonnet-4-6', is_active: true }
      ],
      error: null
    });
    mockMembershipsChain = createChainMock({
      data: [{ org_id: 'org-1' }],
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

  it('should filter by project_id when user has access to it', async () => {
    const { GET } = await import('../../routes/api/v1/writing-agents/+server.js');

    const url = new URL('http://localhost/api/v1/writing-agents?project_id=proj-1');
    const response = await GET({
      cookies: makeCookies(),
      url
    } as never);

    expect(response.status).toBe(200);
    expect(mockAgentsChain.eq).toHaveBeenCalledWith('project_id', 'proj-1');
  });

  it('should reject project_id the user does not have access to', async () => {
    const { GET } = await import('../../routes/api/v1/writing-agents/+server.js');

    const url = new URL('http://localhost/api/v1/writing-agents?project_id=proj-999');
    const response = await GET({
      cookies: makeCookies(),
      url
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    // resolveProjectId returns null for unauthorized project, endpoint returns empty data
    expect(json.data).toEqual([]);
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

describe('POST /api/v1/writing-agents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockMembershipsChain = createChainMock({
      data: [{ org_id: 'org-1' }],
      error: null
    });
    mockProjectChain = createChainMock({
      data: [{ id: 'proj-1', org_id: 'org-1' }],
      error: null
    });
    mockAgentsChain = createChainMock({
      data: { id: 'agent-new', project_id: 'proj-1', name: 'New Agent', description: null, model: 'openai/gpt-4o', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
      error: null
    });
  });

  it('should use only projects the user has membership access to', async () => {
    // User has no org memberships, so should get 404
    mockMembershipsChain = createChainMock({
      data: [],
      error: null
    });

    const { POST } = await import('../../routes/api/v1/writing-agents/+server.js');

    const request = new Request('http://localhost/api/v1/writing-agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Agent',
        model: 'openai/gpt-4o'
      })
    });

    const response = await POST({
      request,
      cookies: makeCookies()
    } as never);

    expect(response.status).toBe(404);
  });

  it('should create agent on a project the user has access to', async () => {
    const { POST } = await import('../../routes/api/v1/writing-agents/+server.js');

    const request = new Request('http://localhost/api/v1/writing-agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Agent',
        model: 'openai/gpt-4o'
      })
    });

    const response = await POST({
      request,
      cookies: makeCookies()
    } as never);

    expect(response.status).toBe(201);
  });
});
