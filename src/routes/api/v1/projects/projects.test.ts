/**
 * @behavior Project CRUD API routes create, read, update, and delete projects
 * scoped to the authenticated user's organizations
 * @business_rule Projects are always scoped to an organization; only members
 * of that organization can access them. Admins/owners can delete projects.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment variables
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
  // When the chain is awaited without .single(), resolve with the terminal value
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(terminalValue));
  return chain;
}

let mockChain: ReturnType<typeof createChainMock>;
let mockAuthUser: { id: string } | null = { id: 'user-1' };
let mockMembershipData: { data: Array<{ org_id: string; role: string }> | null; error: unknown } = {
  data: [{ org_id: 'org-1', role: 'owner' }],
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
      const memberChain = createChainMock(mockMembershipData);
      return memberChain;
    }
    return mockChain;
  })
};

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
  createServiceRoleClient: vi.fn(() => mockSupabase)
}));

// --- Helpers ---

function makeRequest(method: string, body?: Record<string, unknown>, headers?: Record<string, string>): Request {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers }
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new Request('http://localhost/api/v1/projects', init);
}

function makeIdRequest(method: string, body?: Record<string, unknown>): Request {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new Request('http://localhost/api/v1/projects/proj-1', init);
}

describe('POST /api/v1/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockMembershipData = {
      data: [{ org_id: 'org-1', role: 'owner' }],
      error: null
    };
    mockChain = createChainMock({
      data: { id: 'proj-new', org_id: 'org-1', name: 'My Project', domain: null, settings: {} },
      error: null
    });
  });

  it('creates a project scoped to user\'s organization', async () => {
    const { POST } = await import('./+server.js');

    const request = makeRequest('POST', {
      org_id: 'org-1',
      name: 'My Project'
    });

    const response = await POST({ request } as never);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.name).toBe('My Project');
    expect(json.data.org_id).toBe('org-1');
    expect(mockSupabase.from).toHaveBeenCalledWith('projects');
  });
});

describe('GET /api/v1/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockMembershipData = {
      data: [{ org_id: 'org-1', role: 'member' }, { org_id: 'org-2', role: 'admin' }],
      error: null
    };
    mockChain = createChainMock({
      data: [
        { id: 'proj-1', org_id: 'org-1', name: 'Project Alpha' },
        { id: 'proj-2', org_id: 'org-2', name: 'Project Beta' }
      ],
      error: null
    });
  });

  it('returns only projects in user\'s organizations', async () => {
    const { GET } = await import('./+server.js');

    const request = makeRequest('GET');
    const response = await GET({ request } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(2);
    // Verify we filtered by org IDs
    expect(mockChain.in).toHaveBeenCalledWith('org_id', ['org-1', 'org-2']);
  });
});

describe('GET /api/v1/projects/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockMembershipData = {
      data: [{ org_id: 'org-1', role: 'member' }],
      error: null
    };
  });

  it('returns 404 for projects outside user\'s organization', async () => {
    mockChain = createChainMock({
      data: null,
      error: { code: 'PGRST116', message: 'Not found' }
    });

    const { GET } = await import('./[id]/+server.js');

    const request = makeIdRequest('GET');
    const response = await GET({
      request,
      params: { id: 'proj-outside' }
    } as never);

    expect(response.status).toBe(404);
  });
});

describe('PATCH /api/v1/projects/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockMembershipData = {
      data: [{ org_id: 'org-1', role: 'admin' }],
      error: null
    };
    mockChain = createChainMock({
      data: { id: 'proj-1', org_id: 'org-1', name: 'Updated Name', domain: 'example.com', settings: { theme: 'dark' } },
      error: null
    });
  });

  it('updates project name, domain, settings', async () => {
    const { PATCH } = await import('./[id]/+server.js');

    const request = makeIdRequest('PATCH', {
      name: 'Updated Name',
      domain: 'example.com',
      settings: { theme: 'dark' }
    });

    const response = await PATCH({
      request,
      params: { id: 'proj-1' }
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.name).toBe('Updated Name');
    expect(json.data.domain).toBe('example.com');
    expect(mockChain.update).toHaveBeenCalled();
  });
});

describe('DELETE /api/v1/projects/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockMembershipData = {
      data: [{ org_id: 'org-1', role: 'owner' }],
      error: null
    };
    mockChain = createChainMock({
      data: null,
      error: null
    });
  });

  it('removes project (admin/owner only)', async () => {
    const { DELETE } = await import('./[id]/+server.js');

    const request = makeIdRequest('DELETE');
    const response = await DELETE({
      request,
      params: { id: 'proj-1' }
    } as never);

    expect(response.status).toBe(204);
    expect(mockChain.delete).toHaveBeenCalled();
  });
});

describe('RLS cross-organization access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockMembershipData = {
      data: [{ org_id: 'org-1', role: 'member' }],
      error: null
    };
  });

  it('prevents cross-organization project access on POST', async () => {
    const { POST } = await import('./+server.js');

    // User belongs to org-1 but tries to create a project in org-99
    const request = makeRequest('POST', {
      org_id: 'org-99',
      name: 'Sneaky Project'
    });

    const response = await POST({ request } as never);

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });
});
