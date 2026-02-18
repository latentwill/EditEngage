/**
 * @behavior createSupabaseClient() creates a Supabase browser client configured
 * with the project URL and anon key from environment variables, using cookie-based auth
 * @business_rule All client-side Supabase access uses createBrowserClient from @supabase/ssr
 * to ensure auth tokens are stored in cookies (readable by server-side hooks)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

const mockClient = {
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOtp: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn()
  },
  from: vi.fn()
};

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => mockClient)
}));

describe('createSupabaseClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls createBrowserClient with the configured URL and anon key', async () => {
    const { createSupabaseClient } = await import('./supabase.js');
    const { createBrowserClient } = await import('@supabase/ssr');

    createSupabaseClient();

    expect(createBrowserClient).toHaveBeenCalledWith(
      'http://localhost:54321',
      'test-anon-key'
    );
  });

  it('returns a SupabaseClient instance with auth methods', async () => {
    const { createSupabaseClient } = await import('./supabase.js');

    const client = createSupabaseClient();

    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(client.auth.signUp).toBeDefined();
    expect(client.auth.signInWithPassword).toBeDefined();
    expect(client.auth.signOut).toBeDefined();
    expect(client.auth.getSession).toBeDefined();
  });
});
