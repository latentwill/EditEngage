/**
 * @behavior When a new user with no organization memberships loads the dashboard,
 * the layout auto-creates a default workspace and returns it alongside an empty
 * projects list. Existing users get their memberships returned normally.
 * @business_rule Every user must belong to at least one organization to use the
 * dashboard. The system auto-provisions a workspace on first visit.
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

// --- State for mock routing ---

let fromCallIndex: number;
type FromHandler = (table: string) => ReturnType<typeof createChainMock>;
let fromHandlers: FromHandler[];

const mockUser = { id: 'user-1', email: 'new@example.com' };

const mockSupabase = {
  auth: {
    getUser: vi.fn(() =>
      Promise.resolve({ data: { user: mockUser }, error: null })
    )
  },
  from: vi.fn((table: string) => {
    const handler = fromHandlers[fromCallIndex] ?? fromHandlers[fromHandlers.length - 1];
    fromCallIndex++;
    return handler(table);
  })
};

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
  createServiceRoleClient: vi.fn(() => mockSupabase)
}));

// --- Helpers ---

function makeCookies() {
  return {
    get: vi.fn(),
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
    delete: vi.fn(),
    serialize: vi.fn()
  };
}

describe('Dashboard layout onboarding: auto-create organization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromCallIndex = 0;
    fromHandlers = [];
  });

  it('creates an organization when user has no memberships and returns orgId', async () => {
    const newOrgId = 'auto-org-1';

    fromHandlers = [
      // 1st call: query organization_members -> empty
      (_table: string) =>
        createChainMock({ data: [], error: null }),
      // 2nd call: insert into organizations -> new org
      (_table: string) =>
        createChainMock({ data: { id: newOrgId, name: "new@example.com's Workspace" }, error: null }),
      // 3rd call: insert into organization_members -> membership
      (_table: string) =>
        createChainMock({ data: { id: 'mem-1', org_id: newOrgId }, error: null }),
      // 4th call: re-query organization_members -> now has one
      (_table: string) =>
        createChainMock({ data: [{ org_id: newOrgId }], error: null }),
      // 5th call: query projects for the org
      (_table: string) =>
        createChainMock({ data: [], error: null })
    ];

    const { load } = await import('./+layout.server.js');
    const result = await load({ cookies: makeCookies() } as Parameters<typeof load>[0]);

    expect(result.projects).toEqual([]);
    expect(result.orgId).toBe(newOrgId);
    expect(result.session.user.id).toBe('user-1');

    // Verify organization was created
    expect(mockSupabase.from).toHaveBeenCalledWith('organizations');
    expect(mockSupabase.from).toHaveBeenCalledWith('organization_members');
  });

  it('returns existing memberships and orgId without creating a new org', async () => {
    const existingOrgId = 'existing-org-1';

    fromHandlers = [
      // 1st call: query organization_members -> has membership
      (_table: string) =>
        createChainMock({ data: [{ org_id: existingOrgId }], error: null }),
      // 2nd call: query projects
      (_table: string) =>
        createChainMock({
          data: [{ id: 'proj-1', org_id: existingOrgId, name: 'My Project' }],
          error: null
        })
    ];

    const { load } = await import('./+layout.server.js');
    const result = await load({ cookies: makeCookies() } as Parameters<typeof load>[0]);

    expect(result.projects).toEqual([
      { id: 'proj-1', org_id: existingOrgId, name: 'My Project' }
    ]);
    expect(result.orgId).toBe(existingOrgId);
    expect(result.session.user.id).toBe('user-1');

    // Should only call from() twice: once for memberships, once for projects
    expect(mockSupabase.from).toHaveBeenCalledTimes(2);
  });
});
