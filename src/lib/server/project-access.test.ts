/**
 * @behavior resolveProjectId validates that the user has access to the requested project
 * @business_rule A user should only be able to resolve project IDs for projects they
 * are members of via their organization memberships. Providing an arbitrary project_id
 * without ownership should return null (IDOR prevention).
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
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(terminalValue);
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(terminalValue));
  return chain;
}

let mockMembershipsChain: ReturnType<typeof createChainMock>;
let mockProjectsChain: ReturnType<typeof createChainMock>;

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === 'organization_members') return mockMembershipsChain;
    if (table === 'projects') return mockProjectsChain;
    return createChainMock({ data: null, error: null });
  })
};

describe('resolveProjectId', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should return null when user provides a project_id they do not have access to', async () => {
    // User belongs to org-1, which has proj-1. They request proj-999 (not theirs).
    mockMembershipsChain = createChainMock({
      data: [{ org_id: 'org-1' }],
      error: null
    });
    mockProjectsChain = createChainMock({
      data: [{ id: 'proj-1', org_id: 'org-1' }],
      error: null
    });

    const { resolveProjectId } = await import('./project-access');

    const result = await resolveProjectId(
      mockSupabase as never,
      'proj-999',
      'user-1'
    );

    expect(result).toBeNull();
  });

  it('should return the project_id when user has access to it', async () => {
    mockMembershipsChain = createChainMock({
      data: [{ org_id: 'org-1' }],
      error: null
    });
    mockProjectsChain = createChainMock({
      data: [{ id: 'proj-1', org_id: 'org-1' }],
      error: null
    });

    const { resolveProjectId } = await import('./project-access');

    const result = await resolveProjectId(
      mockSupabase as never,
      'proj-1',
      'user-1'
    );

    expect(result).toBe('proj-1');
  });

  it('should fall back to first accessible project when no project_id provided', async () => {
    mockMembershipsChain = createChainMock({
      data: [{ org_id: 'org-1' }],
      error: null
    });
    mockProjectsChain = createChainMock({
      data: [{ id: 'proj-1', org_id: 'org-1' }],
      error: null
    });

    const { resolveProjectId } = await import('./project-access');

    const result = await resolveProjectId(
      mockSupabase as never,
      null,
      'user-1'
    );

    expect(result).toBe('proj-1');
  });

  it('should return null when user has no organization memberships', async () => {
    mockMembershipsChain = createChainMock({
      data: [],
      error: null
    });
    mockProjectsChain = createChainMock({
      data: [],
      error: null
    });

    const { resolveProjectId } = await import('./project-access');

    const result = await resolveProjectId(
      mockSupabase as never,
      'proj-1',
      'user-1'
    );

    expect(result).toBeNull();
  });
});
