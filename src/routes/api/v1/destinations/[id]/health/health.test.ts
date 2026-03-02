/**
 * @behavior POST /api/v1/destinations/[id]/health checks connectivity to the destination
 * @business_rule Test Connection button must give immediate feedback on whether credentials work
 */
import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));
vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom
  }))
}));

import { POST } from './+server.js';


function makeEvent(id: string, cookies = {}): Parameters<typeof POST>[0] {
  return {
    params: { id },
    cookies,
    request: new Request(`http://localhost/api/v1/destinations/${id}/health`, { method: 'POST' }),
    url: new URL(`http://localhost/api/v1/destinations/${id}/health`),
    locals: {},
    route: { id: '/api/v1/destinations/[id]/health' },
    fetch: global.fetch,
    getClientAddress: () => '127.0.0.1',
    platform: {},
    setHeaders: vi.fn(),
    isDataRequest: false,
    isSubRequest: false,
  } as unknown as Parameters<typeof POST>[0];
}

const ghostContentDest = {
  id: 'dest-1',
  type: 'ghost',
  config: { api_url: 'https://myblog.com', key_type: 'content', key: 'contentkey123' }
};

const ghostAdminDest = {
  id: 'dest-1',
  type: 'ghost',
  config: { api_url: 'https://myblog.com', key_type: 'admin', key: 'aabbcc:ddeeff00112233445566778899aabbcc' }
};

describe('POST /api/v1/destinations/[id]/health', () => {
  let fetchSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchSpy = vi.spyOn(globalThis, 'fetch') as unknown as MockInstance;
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Not authenticated') });

    const res = await POST(makeEvent('dest-1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when destination does not exist or belongs to another user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
        })
      })
    });

    const res = await POST(makeEvent('dest-1'));
    expect(res.status).toBe(404);
  });

  it('returns healthy when Ghost Content API responds 200', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: ghostContentDest, error: null })
        })
      })
    });
    fetchSpy.mockResolvedValue(new Response('{}', { status: 200 }));

    const res = await POST(makeEvent('dest-1'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe('healthy');
  });

  it('returns unhealthy when Ghost Content API responds 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: ghostContentDest, error: null })
        })
      })
    });
    fetchSpy.mockResolvedValue(new Response('{"errors":[{"type":"UnauthorizedError"}]}', { status: 401 }));

    const res = await POST(makeEvent('dest-1'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe('unhealthy');
    expect(body.message).toContain('401');
  });

  it('returns unhealthy when Ghost API fetch throws (network error)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: ghostContentDest, error: null })
        })
      })
    });
    fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));

    const res = await POST(makeEvent('dest-1'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe('unhealthy');
    expect(body.message).toContain('ECONNREFUSED');
  });

  it('returns healthy when Ghost Admin API responds 200', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: ghostAdminDest, error: null })
        })
      })
    });
    fetchSpy.mockResolvedValue(new Response('{}', { status: 200 }));

    const res = await POST(makeEvent('dest-1'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe('healthy');
    // Verify it called the Admin API endpoint
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/ghost/api/admin/site/'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Ghost /) }) })
    );
  });

  it('returns 400 for unsupported destination type', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'dest-2', type: 'webhook', config: {} },
            error: null
          })
        })
      })
    });

    const res = await POST(makeEvent('dest-2'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('webhook');
  });
});
