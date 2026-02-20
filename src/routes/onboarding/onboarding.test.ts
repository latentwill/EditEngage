/**
 * @behavior The /onboarding route guards against users who already have an org,
 * and creates a new org via service role form action for users who don't.
 * @business_rule Org creation must use service role to bypass RLS and must
 * happen via POST (form action), not GET (load), to respect HTTP semantics.
 * Users with an existing org are skipped past onboarding immediately.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  },
  error: (status: number, message: string) => {
    const err = { status, message };
    throw err;
  }
}));

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

// ---------------------------------------------------------------------------
// Layout server guard
// ---------------------------------------------------------------------------

describe('Onboarding layout server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /dashboard when user already has an org', async () => {
    anonClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: vi.fn().mockReturnValue(chain({ data: [{ org_id: 'org-1' }], error: null }))
    };
    serviceClient = { auth: { getUser: vi.fn() }, from: vi.fn() };

    const { load } = await import('./+layout.server.js');

    await expect(
      load({ cookies: makeCookies() } as Parameters<typeof load>[0])
    ).rejects.toMatchObject({ status: 303, location: '/dashboard' });
  });

  it('returns without redirect when user has no org', async () => {
    anonClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: vi.fn().mockReturnValue(chain({ data: [], error: null }))
    };
    serviceClient = { auth: { getUser: vi.fn() }, from: vi.fn() };

    const { load } = await import('./+layout.server.js');

    const result = await load({ cookies: makeCookies() } as Parameters<typeof load>[0]);
    expect(result).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Page server load — no side effects on GET
// ---------------------------------------------------------------------------

describe('Onboarding page server load (GET)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty data for authenticated users (no DB side effects)', async () => {
    anonClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: vi.fn()
    };
    serviceClient = { auth: { getUser: vi.fn() }, from: vi.fn() };

    const { load } = await import('./+page.server.js');
    const result = await load({ cookies: makeCookies() } as Parameters<typeof load>[0]);

    expect(result).toBeDefined();
    // Must not touch the database on GET
    expect(anonClient.from).not.toHaveBeenCalled();
    expect(serviceClient.from).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Form action: org creation (POST only)
// ---------------------------------------------------------------------------

describe('Onboarding page action (POST)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates org via service role and redirects to /dashboard', async () => {
    const newOrgId = 'new-org-1';
    anonClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: vi.fn()
    };
    serviceClient = {
      auth: { getUser: vi.fn() },
      from: vi.fn()
        // 1st: member idempotency check — no membership
        .mockReturnValueOnce(chain({ data: null, error: null }))
        // 2nd: org existence check — no existing org
        .mockReturnValueOnce(chain({ data: null, error: null }))
        // 3rd: org insert
        .mockReturnValueOnce(chain({ data: { id: newOrgId }, error: null }))
        // 4th: membership insert
        .mockReturnValueOnce(chain({ data: { id: 'mem-1', org_id: newOrgId }, error: null }))
    };

    const { actions } = await import('./+page.server.js');

    await expect(
      actions.default({ cookies: makeCookies() } as Parameters<typeof actions.default>[0])
    ).rejects.toMatchObject({ status: 303, location: '/dashboard' });

    expect(serviceClient.from).toHaveBeenCalledWith('organization_members');
    expect(serviceClient.from).toHaveBeenCalledWith('organizations');
    expect(anonClient.from).not.toHaveBeenCalled();
  });

  it('attaches membership to existing org when DB trigger created org but not membership', async () => {
    const existingOrgId = 'trigger-org-1';
    anonClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: vi.fn()
    };
    serviceClient = {
      auth: { getUser: vi.fn() },
      from: vi.fn()
        // 1st: member idempotency check — no membership
        .mockReturnValueOnce(chain({ data: null, error: null }))
        // 2nd: org existence check — org EXISTS (from DB trigger)
        .mockReturnValueOnce(chain({ data: { id: existingOrgId }, error: null }))
        // 3rd: membership insert (no org insert needed)
        .mockReturnValueOnce(chain({ data: { id: 'mem-1', org_id: existingOrgId }, error: null }))
    };

    const { actions } = await import('./+page.server.js');

    await expect(
      actions.default({ cookies: makeCookies() } as Parameters<typeof actions.default>[0])
    ).rejects.toMatchObject({ status: 303, location: '/dashboard' });

    // Should not create a duplicate org
    expect(serviceClient.from).toHaveBeenCalledTimes(3);
  });

  it('redirects to /dashboard immediately when membership already exists (idempotency)', async () => {
    anonClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: vi.fn()
    };
    serviceClient = {
      auth: { getUser: vi.fn() },
      from: vi.fn()
        // Idempotency check finds existing membership
        .mockReturnValueOnce(chain({ data: { org_id: 'existing-org' }, error: null }))
    };

    const { actions } = await import('./+page.server.js');

    await expect(
      actions.default({ cookies: makeCookies() } as Parameters<typeof actions.default>[0])
    ).rejects.toMatchObject({ status: 303, location: '/dashboard' });

    // Must not attempt to create a new org
    expect(serviceClient.from).toHaveBeenCalledTimes(1);
  });

  it('throws 500 error when org creation fails', async () => {
    anonClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: vi.fn()
    };
    serviceClient = {
      auth: { getUser: vi.fn() },
      from: vi.fn()
        // 1st: member idempotency check — no membership
        .mockReturnValueOnce(chain({ data: null, error: null }))
        // 2nd: org existence check — no existing org
        .mockReturnValueOnce(chain({ data: null, error: null }))
        // 3rd: org insert fails
        .mockReturnValueOnce(chain({ data: null, error: { message: 'DB error' } }))
    };

    const { actions } = await import('./+page.server.js');

    await expect(
      actions.default({ cookies: makeCookies() } as Parameters<typeof actions.default>[0])
    ).rejects.toMatchObject({ status: 500 });
  });

  it('throws 500 and rolls back org when membership insert fails', async () => {
    const newOrgId = 'new-org-rollback';
    anonClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) },
      from: vi.fn()
    };

    serviceClient = {
      auth: { getUser: vi.fn() },
      from: vi.fn()
        // 1st: member idempotency check — no membership
        .mockReturnValueOnce(chain({ data: null, error: null }))
        // 2nd: org existence check — no existing org
        .mockReturnValueOnce(chain({ data: null, error: null }))
        // 3rd: org insert succeeds
        .mockReturnValueOnce(chain({ data: { id: newOrgId }, error: null }))
        // 4th: membership insert fails
        .mockReturnValueOnce(chain({ data: null, error: { message: 'constraint violation' } }))
        // 5th: rollback delete
        .mockReturnValueOnce(chain({ data: null, error: null }))
    };

    const { actions } = await import('./+page.server.js');

    await expect(
      actions.default({ cookies: makeCookies() } as Parameters<typeof actions.default>[0])
    ).rejects.toMatchObject({ status: 500 });

    expect(serviceClient.from).toHaveBeenCalledWith('organizations');
    expect(serviceClient.from).toHaveBeenCalledTimes(5);
  });
});
