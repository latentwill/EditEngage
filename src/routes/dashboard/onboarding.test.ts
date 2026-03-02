/**
 * @behavior When a new user with no organization memberships loads the dashboard,
 * they are redirected to /onboarding where org creation occurs via service role.
 * Existing users get their memberships and projects returned normally.
 * @business_rule Every user must belong to at least one organization to use the
 * dashboard. Org creation is handled exclusively by /onboarding, not this layout.
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

vi.mock('@sveltejs/kit', () => ({
  redirect: (status: number, location: string) => {
    const err = { status, location };
    throw err;
  }
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

const mockUser = { id: 'user-1', email: 'new@example.com' };

const mockSupabase = {
  auth: {
    getUser: vi.fn(() =>
      Promise.resolve({ data: { user: mockUser }, error: null })
    )
  },
  from: vi.fn()
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

describe('Dashboard layout: org membership check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /onboarding when user has no org memberships', async () => {
    mockSupabase.from.mockReturnValue(
      createChainMock({ data: [], error: null })
    );

    const { load } = await import('./+layout.server.js');

    await expect(
      load({ cookies: makeCookies() } as unknown as Parameters<typeof load>[0])
    ).rejects.toMatchObject({
      status: 303,
      location: '/onboarding'
    });

    // Must NOT attempt to create an org in this layout
    expect(mockSupabase.from).not.toHaveBeenCalledWith('organizations');
  });

  it('returns existing memberships and orgId without creating a new org', async () => {
    const existingOrgId = 'existing-org-1';

    mockSupabase.from
      .mockReturnValueOnce(
        createChainMock({ data: [{ org_id: existingOrgId }], error: null })
      )
      .mockReturnValueOnce(
        createChainMock({
          data: [{ id: 'proj-1', org_id: existingOrgId, name: 'My Project' }],
          error: null
        })
      );

    const { load } = await import('./+layout.server.js');
    const result = await load({ cookies: makeCookies() } as unknown as Parameters<typeof load>[0]);

    expect(result.projects).toEqual([
      { id: 'proj-1', org_id: existingOrgId, name: 'My Project' }
    ]);
    expect(result.orgId).toBe(existingOrgId);
    expect(result.session!.user.id).toBe('user-1');

    // Should only call from() twice: memberships + projects (no org creation)
    expect(mockSupabase.from).toHaveBeenCalledTimes(2);
  });
});
