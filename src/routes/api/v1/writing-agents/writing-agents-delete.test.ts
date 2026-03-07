/**
 * @behavior DELETE /api/v1/writing-agents/:id removes a writing agent
 * @business_rule Only authenticated users can delete agents; RLS enforces project scoping
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(terminalValue);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(terminalValue));
  return chain;
}

let mockAuthUser: { id: string } | null = { id: 'user-1' };
let deleteChain: ReturnType<typeof createChainMock>;

const mockSupabase = {
  auth: {
    getUser: vi.fn(() =>
      Promise.resolve({
        data: { user: mockAuthUser },
        error: mockAuthUser ? null : { message: 'Not authenticated' }
      })
    )
  },
  from: vi.fn((table: string) => {
    if (table === 'writing_agents') return deleteChain;
    return createChainMock({ data: null, error: null });
  })
};

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
  createServiceRoleClient: vi.fn(() => mockSupabase)
}));

let mockUserProjects: Array<{ id: string; org_id: string }>;

vi.mock('$lib/server/project-access', () => ({
  getUserProjects: vi.fn(() => Promise.resolve(mockUserProjects))
}));

// --- Tests ---

describe('DELETE /api/v1/writing-agents/:id', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockUserProjects = [{ id: 'proj-1', org_id: 'org-1' }];
  });

  it('should return 200 with success true when agent is deleted', async () => {
    deleteChain = createChainMock({
      data: { id: 'agent-1', project_id: 'proj-1' },
      error: null
    });

    const { DELETE } = await import('./[id]/+server.js');

    const response = await DELETE({
      params: { id: 'agent-1' },
      cookies: {}
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('should return 401 when not authenticated', async () => {
    mockAuthUser = null;
    deleteChain = createChainMock({ data: null, error: null });

    const { DELETE } = await import('./[id]/+server.js');

    const response = await DELETE({
      params: { id: 'agent-1' },
      cookies: {}
    } as never);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('should return 500 when database error occurs', async () => {
    deleteChain = createChainMock({
      data: { id: 'agent-1', project_id: 'proj-1' },
      error: { message: 'DB failure', code: 'INTERNAL' }
    });

    const { DELETE } = await import('./[id]/+server.js');

    const response = await DELETE({
      params: { id: 'agent-1' },
      cookies: {}
    } as never);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('should return 404 when agent belongs to a project the user cannot access', async () => {
    // Agent exists but belongs to proj-999 which user does NOT have access to
    deleteChain = createChainMock({
      data: { id: 'agent-1', project_id: 'proj-999' },
      error: null
    });
    mockUserProjects = [{ id: 'proj-1', org_id: 'org-1' }];

    const { DELETE } = await import('./[id]/+server.js');

    const response = await DELETE({
      params: { id: 'agent-1' },
      cookies: {}
    } as never);

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('should return 404 when agent does not exist', async () => {
    deleteChain = createChainMock({ data: null, error: null });

    const { DELETE } = await import('./[id]/+server.js');

    const response = await DELETE({
      params: { id: 'nonexistent' },
      cookies: {}
    } as never);

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });
});
