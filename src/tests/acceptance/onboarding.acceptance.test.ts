/**
 * Acceptance tests for the onboarding flow.
 *
 * These tests describe the CORRECT behavior of the onboarding system.
 * They test the system boundary (load functions) without rendering UI.
 *
 * Flow under test:
 *   1. New user (no org) hits /dashboard → redirected to /onboarding
 *   2. /onboarding creates org via service role → redirects to /dashboard
 *   3. Existing user (has org) hits /onboarding → redirected to /dashboard
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

// ---------------------------------------------------------------------------
// Shared mock infrastructure
// ---------------------------------------------------------------------------

function chain(terminalValue: { data: unknown; error: unknown }) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  c.select = vi.fn().mockReturnValue(c);
  c.insert = vi.fn().mockReturnValue(c);
  c.delete = vi.fn().mockReturnValue(c);
  c.eq = vi.fn().mockReturnValue(c);
  c.in = vi.fn().mockReturnValue(c);
  c.single = vi.fn().mockResolvedValue(terminalValue);
  c.maybeSingle = vi.fn().mockResolvedValue(terminalValue);
  c.order = vi.fn().mockReturnValue(c);
  c.then = vi.fn((resolve: (v: unknown) => void) => resolve(terminalValue));
  return c;
}

function makeCookies() {
  return {
    get: vi.fn(),
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
    delete: vi.fn(),
    serialize: vi.fn()
  };
}

const mockUser = { id: 'user-1', email: 'test@example.com' };

let anonClient: { auth: Record<string, ReturnType<typeof vi.fn>>; from: ReturnType<typeof vi.fn> };
let serviceClient: { auth: Record<string, ReturnType<typeof vi.fn>>; from: ReturnType<typeof vi.fn> };

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => anonClient),
  createServiceRoleClient: vi.fn(() => serviceClient)
}));

vi.mock('@sveltejs/kit', () => ({
  redirect: (status: number, location: string) => {
    const err = { status, location };
    throw err;
  },
  error: (status: number, message: string) => {
    const err = { status, message };
    throw err;
  }
}));

// ---------------------------------------------------------------------------
// 1. Dashboard layout redirects to /onboarding when user has no org
// ---------------------------------------------------------------------------

describe('Dashboard layout: redirects to /onboarding when user has no org', () => {
  /**
   * @behavior When an authenticated user has no organization memberships,
   * the dashboard layout server redirects to /onboarding instead of
   * auto-creating an org (which fails due to RLS with anon client)
   * @business_rule Every user must have an org to use the dashboard.
   * Org creation is handled by /onboarding, not the dashboard layout.
   */
  it('redirects to /onboarding when user has no org memberships', async () => {
    anonClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: vi.fn().mockReturnValue(chain({ data: [], error: null }))
    };
    serviceClient = { auth: { getUser: vi.fn() }, from: vi.fn() };

    const { load } = await import('../../routes/dashboard/+layout.server.js');

    await expect(load({ cookies: makeCookies() } as Parameters<typeof load>[0])).rejects.toMatchObject({
      status: 303,
      location: '/onboarding'
    });
  });

  /**
   * @behavior When the user does have an org, the dashboard layout loads normally
   * @business_rule Dashboard must not redirect users who already have an org
   */
  it('loads normally when user has an existing org', async () => {
    const orgId = 'org-existing';
    anonClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: vi.fn()
        .mockReturnValueOnce(chain({ data: [{ org_id: orgId }], error: null }))  // memberships
        .mockReturnValueOnce(chain({ data: [], error: null }))                    // projects
    };
    serviceClient = { auth: { getUser: vi.fn() }, from: vi.fn() };

    const { load } = await import('../../routes/dashboard/+layout.server.js');
    const result = await load({ cookies: makeCookies() } as Parameters<typeof load>[0]);

    expect(result.orgId).toBe(orgId);
    expect(result.projects).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 2. Onboarding layout guard: skip to /dashboard if org already exists
// ---------------------------------------------------------------------------

describe('Onboarding layout: skips to /dashboard when org exists', () => {
  /**
   * @behavior If a user who already has an org lands on /onboarding (e.g., via
   * bookmark), they are immediately redirected to /dashboard
   * @business_rule /onboarding is only needed for users without an org
   */
  it('redirects to /dashboard when user already has an org', async () => {
    anonClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: vi.fn().mockReturnValue(chain({ data: [{ org_id: 'org-1' }], error: null }))
    };
    serviceClient = { auth: { getUser: vi.fn() }, from: vi.fn() };

    const { load } = await import('../../routes/onboarding/+layout.server.js');

    await expect(load({ cookies: makeCookies() } as Parameters<typeof load>[0])).rejects.toMatchObject({
      status: 303,
      location: '/dashboard'
    });
  });

  /**
   * @behavior If user has no org, the layout allows rendering the onboarding page
   * @business_rule /onboarding must not redirect users who still need org creation
   */
  it('allows rendering when user has no org', async () => {
    anonClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: vi.fn().mockReturnValue(chain({ data: [], error: null }))
    };
    serviceClient = { auth: { getUser: vi.fn() }, from: vi.fn() };

    const { load } = await import('../../routes/onboarding/+layout.server.js');

    // Should not throw — should return normally (empty object or void)
    const result = await load({ cookies: makeCookies() } as Parameters<typeof load>[0]);
    expect(result).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 3. Onboarding page: creates org via service role and redirects to /dashboard
// ---------------------------------------------------------------------------

describe('Onboarding page action: creates org and redirects to /dashboard', () => {
  /**
   * @behavior The onboarding page action (POST) creates an org using the service
   * role client (bypassing RLS) and redirects the user to /dashboard on success.
   * Org creation is a POST action, never a GET load, to respect HTTP semantics.
   * @business_rule Org creation must use service role to bypass RLS.
   * The anon client cannot insert into organizations before org exists.
   */
  it('creates org via service role and redirects to /dashboard', async () => {
    const newOrgId = 'new-org-1';
    anonClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: vi.fn()
    };
    serviceClient = {
      auth: { getUser: vi.fn() },
      from: vi.fn()
        // 1st: idempotency check — no existing membership
        .mockReturnValueOnce(chain({ data: null, error: null }))
        // 2nd: org insert
        .mockReturnValueOnce(chain({ data: { id: newOrgId, name: "test@example.com's Workspace" }, error: null }))
        // 3rd: membership insert
        .mockReturnValueOnce(chain({ data: { id: 'mem-1', org_id: newOrgId }, error: null }))
    };

    const { actions } = await import('../../routes/onboarding/+page.server.js');

    await expect(
      actions.default({ cookies: makeCookies() } as Parameters<typeof actions.default>[0])
    ).rejects.toMatchObject({ status: 303, location: '/dashboard' });

    // Verify service role client was used (not anon client)
    expect(serviceClient.from).toHaveBeenCalledWith('organizations');
    expect(serviceClient.from).toHaveBeenCalledWith('organization_members');
    expect(anonClient.from).not.toHaveBeenCalled();
  });

  /**
   * @behavior If org creation fails, the action throws an error rather
   * than silently failing (which left users in a broken state before)
   * @business_rule Users must always land on /dashboard with a valid org.
   * Silent failures are not acceptable.
   */
  it('throws an error when org creation fails', async () => {
    anonClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: vi.fn()
    };
    serviceClient = {
      auth: { getUser: vi.fn() },
      from: vi.fn()
        // 1st: idempotency check — no existing membership
        .mockReturnValueOnce(chain({ data: null, error: null }))
        // 2nd: org insert fails
        .mockReturnValueOnce(chain({ data: null, error: { message: 'DB error' } }))
    };

    const { actions } = await import('../../routes/onboarding/+page.server.js');

    await expect(
      actions.default({ cookies: makeCookies() } as Parameters<typeof actions.default>[0])
    ).rejects.toMatchObject({ status: 500 });
  });
});
