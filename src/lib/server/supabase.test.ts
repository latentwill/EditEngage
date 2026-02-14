/**
 * @behavior createServerSupabaseClient(cookies) creates a Supabase SSR client that
 * reads auth from cookies and respects RLS. createServiceRoleClient() creates a
 * service role client that bypasses RLS for admin operations.
 * @business_rule User-facing routes use anon key with cookie-based auth (RLS enforced),
 * while worker/admin operations use service_role key to bypass RLS.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

const mockSsrClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn()
};

const mockServiceClient = {
  auth: { admin: vi.fn() },
  from: vi.fn()
};

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSsrClient)
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockServiceClient)
}));

const mockCookies = {
  getAll: vi.fn().mockReturnValue([]),
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  serialize: vi.fn()
};

describe('createServerSupabaseClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates SSR client with anon key and cookie adapter for RLS enforcement', async () => {
    const { createServerSupabaseClient } = await import('./supabase.js');
    const { createServerClient } = await import('@supabase/ssr');

    createServerSupabaseClient(mockCookies as never);

    expect(createServerClient).toHaveBeenCalledWith(
      'http://localhost:54321',
      'test-anon-key',
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function)
        })
      })
    );
  });

  it('uses the PUBLIC_SUPABASE_URL from environment', async () => {
    const { createServerSupabaseClient } = await import('./supabase.js');
    const { createServerClient } = await import('@supabase/ssr');

    createServerSupabaseClient(mockCookies as never);

    const [url] = (createServerClient as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('http://localhost:54321');
  });

  it('returns a SupabaseClient instance', async () => {
    const { createServerSupabaseClient } = await import('./supabase.js');

    const client = createServerSupabaseClient(mockCookies as never);

    expect(client).toBeDefined();
    expect(client.from).toBeDefined();
  });
});

describe('createServiceRoleClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates client with service_role key for RLS bypass', async () => {
    const { createServiceRoleClient } = await import('./supabase.js');
    const { createClient } = await import('@supabase/supabase-js');

    createServiceRoleClient();

    expect(createClient).toHaveBeenCalledWith(
      'http://localhost:54321',
      'test-service-role-key'
    );
  });

  it('returns a SupabaseClient instance', async () => {
    const { createServiceRoleClient } = await import('./supabase.js');

    const client = createServiceRoleClient();

    expect(client).toBeDefined();
    expect(client.from).toBeDefined();
  });
});
