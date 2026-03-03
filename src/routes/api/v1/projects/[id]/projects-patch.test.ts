/**
 * @behavior PATCH /api/v1/projects/:id updates project settings fields
 * (name, description, domain, color) for authenticated users with org access
 * @business_rule Only organization members can update their projects;
 * RLS hides projects the user cannot access, returning 404
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

let mockChain: ReturnType<typeof createChainMock>;
let mockAuthUser: { id: string } | null = { id: 'user-1' };
let mockMembershipData: { data: Array<{ org_id: string; role: string }> | null; error: unknown } = {
  data: [{ org_id: 'org-1', role: 'admin' }],
  error: null
};

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({
      data: { user: mockAuthUser },
      error: mockAuthUser ? null : { message: 'Not authenticated' }
    }))
  },
  from: vi.fn((table: string) => {
    if (table === 'organization_members') {
      return createChainMock(mockMembershipData);
    }
    return mockChain;
  })
};

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
  createServiceRoleClient: vi.fn(() => mockSupabase)
}));

function makePatchRequest(body?: Record<string, unknown>): Request {
  const init: RequestInit = {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new Request('http://localhost/api/v1/projects/proj-1', init);
}

describe('PATCH /api/v1/projects/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockMembershipData = {
      data: [{ org_id: 'org-1', role: 'admin' }],
      error: null
    };
    mockChain = createChainMock({
      data: { id: 'proj-1', org_id: 'org-1', name: 'Updated', description: 'Desc', domain: 'example.com', color: '#ff0000' },
      error: null
    });
  });

  it('returns 401 when user is not authenticated', async () => {
    mockAuthUser = null;

    const { PATCH } = await import('./+server.js');
    const response = await PATCH({
      request: makePatchRequest({ name: 'New Name' }),
      params: { id: 'proj-1' },
      cookies: {}
    } as never);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 400 when no valid fields are provided', async () => {
    const { PATCH } = await import('./+server.js');
    const response = await PATCH({
      request: makePatchRequest({}),
      params: { id: 'proj-1' },
      cookies: {}
    } as never);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('returns 404 when project is not found (RLS hides it)', async () => {
    mockChain = createChainMock({
      data: null,
      error: { code: 'PGRST116', message: 'Not found' }
    });

    const { PATCH } = await import('./+server.js');
    const response = await PATCH({
      request: makePatchRequest({ name: 'New Name' }),
      params: { id: 'proj-nonexistent' },
      cookies: {}
    } as never);

    expect(response.status).toBe(404);
  });

  it('updates name field and returns updated project', async () => {
    mockChain = createChainMock({
      data: { id: 'proj-1', org_id: 'org-1', name: 'New Name', description: null, domain: null, color: null },
      error: null
    });

    const { PATCH } = await import('./+server.js');
    const response = await PATCH({
      request: makePatchRequest({ name: 'New Name' }),
      params: { id: 'proj-1' },
      cookies: {}
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.name).toBe('New Name');
    expect(mockChain.update).toHaveBeenCalled();
  });

  it('updates color field and returns updated project', async () => {
    mockChain = createChainMock({
      data: { id: 'proj-1', org_id: 'org-1', name: 'Project', color: '#00ff00' },
      error: null
    });

    const { PATCH } = await import('./+server.js');
    const response = await PATCH({
      request: makePatchRequest({ color: '#00ff00' }),
      params: { id: 'proj-1' },
      cookies: {}
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.color).toBe('#00ff00');
    expect(mockChain.update).toHaveBeenCalled();
  });

  it('updates multiple fields at once', async () => {
    mockChain = createChainMock({
      data: { id: 'proj-1', org_id: 'org-1', name: 'Multi', description: 'Desc', domain: 'test.com', color: '#abc123' },
      error: null
    });

    const { PATCH } = await import('./+server.js');
    const response = await PATCH({
      request: makePatchRequest({ name: 'Multi', description: 'Desc', domain: 'test.com', color: '#abc123' }),
      params: { id: 'proj-1' },
      cookies: {}
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.name).toBe('Multi');
    expect(json.data.description).toBe('Desc');
    expect(json.data.domain).toBe('test.com');
    expect(json.data.color).toBe('#abc123');
  });

  it('ignores unknown fields and only passes allowed fields to update', async () => {
    const { PATCH } = await import('./+server.js');
    await PATCH({
      request: makePatchRequest({ name: 'Valid', hackerField: 'malicious', org_id: 'org-hacked' }),
      params: { id: 'proj-1' },
      cookies: {}
    } as never);

    const updateCall = mockChain.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateCall).not.toHaveProperty('hackerField');
    expect(updateCall).not.toHaveProperty('org_id');
    expect(updateCall).toHaveProperty('name', 'Valid');
  });
});
