/**
 * @behavior Organization tenant config API returns org data for members
 * and allows admins/owners to update tenant configuration fields.
 * @business_rule Only org members can read org data. Only admins/owners
 * can update tenant config. tenant_type and enabled_modules are validated.
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
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(terminalValue));
  return chain;
}

let mockOrgChain: ReturnType<typeof createChainMock>;
let mockAuthUser: { id: string } | null = { id: 'user-1' };
let mockMembershipData: { data: { org_id: string; role: string } | null; error: unknown } = {
  data: { org_id: 'org-1', role: 'owner' },
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
    return mockOrgChain;
  })
};

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
  createServiceRoleClient: vi.fn(() => mockSupabase)
}));

// --- Helpers ---

const ORG_DATA = {
  id: 'org-1',
  name: 'Test Org',
  owner_id: 'user-1',
  settings: {},
  tenant_type: 'content',
  vocabulary_labels: { article: 'Article', project: 'Project' },
  default_writing_style_preset: 'professional',
  default_destination_types: ['blog', 'social'],
  ui_theme: { primaryColor: '#000' },
  enabled_modules: ['research', 'writing'],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
};

function makeRequest(method: string, body?: Record<string, unknown>): Request {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new Request('http://localhost/api/v1/organizations/org-1', init);
}

// --- GET /api/v1/organizations/:id ---

describe('GET /api/v1/organizations/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockMembershipData = {
      data: { org_id: 'org-1', role: 'member' },
      error: null
    };
    mockOrgChain = createChainMock({
      data: { ...ORG_DATA },
      error: null
    });
  });

  it('returns org with tenant config fields for authenticated member', async () => {
    const { GET } = await import('./+server.js');

    const response = await GET({
      request: makeRequest('GET'),
      params: { id: 'org-1' },
      cookies: {}
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.id).toBe('org-1');
    expect(json.data.tenant_type).toBe('content');
    expect(json.data.vocabulary_labels).toEqual({ article: 'Article', project: 'Project' });
    expect(json.data.enabled_modules).toEqual(['research', 'writing']);
    expect(json.data.ui_theme).toEqual({ primaryColor: '#000' });
    expect(json.data.default_writing_style_preset).toBe('professional');
    expect(json.data.default_destination_types).toEqual(['blog', 'social']);
  });

  it('returns 401 for unauthenticated request', async () => {
    mockAuthUser = null;

    const { GET } = await import('./+server.js');

    const response = await GET({
      request: makeRequest('GET'),
      params: { id: 'org-1' },
      cookies: {}
    } as never);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('returns 403 for non-member', async () => {
    mockMembershipData = {
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' }
    };

    const { GET } = await import('./+server.js');

    const response = await GET({
      request: makeRequest('GET'),
      params: { id: 'org-1' },
      cookies: {}
    } as never);

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });
});

// --- PATCH /api/v1/organizations/:id ---

describe('PATCH /api/v1/organizations/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockMembershipData = {
      data: { org_id: 'org-1', role: 'admin' },
      error: null
    };
    mockOrgChain = createChainMock({
      data: {
        ...ORG_DATA,
        vocabulary_labels: { article: 'Post', project: 'Campaign' }
      },
      error: null
    });
  });

  it('updates vocabulary_labels for org admin', async () => {
    const { PATCH } = await import('./+server.js');

    const response = await PATCH({
      request: makeRequest('PATCH', {
        vocabulary_labels: { article: 'Post', project: 'Campaign' }
      }),
      params: { id: 'org-1' },
      cookies: {}
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.vocabulary_labels).toEqual({ article: 'Post', project: 'Campaign' });
    expect(mockOrgChain.update).toHaveBeenCalled();
  });

  it('updates enabled_modules for org owner', async () => {
    mockMembershipData = {
      data: { org_id: 'org-1', role: 'owner' },
      error: null
    };
    mockOrgChain = createChainMock({
      data: {
        ...ORG_DATA,
        enabled_modules: ['research', 'writing', 'publish']
      },
      error: null
    });

    const { PATCH } = await import('./+server.js');

    const response = await PATCH({
      request: makeRequest('PATCH', {
        enabled_modules: ['research', 'writing', 'publish']
      }),
      params: { id: 'org-1' },
      cookies: {}
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.enabled_modules).toEqual(['research', 'writing', 'publish']);
  });

  it('rejects invalid tenant_type with 400', async () => {
    const { PATCH } = await import('./+server.js');

    const response = await PATCH({
      request: makeRequest('PATCH', {
        tenant_type: 'invalid-type'
      }),
      params: { id: 'org-1' },
      cookies: {}
    } as never);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('returns 403 for regular member (not admin/owner)', async () => {
    mockMembershipData = {
      data: { org_id: 'org-1', role: 'member' },
      error: null
    };

    const { PATCH } = await import('./+server.js');

    const response = await PATCH({
      request: makeRequest('PATCH', {
        vocabulary_labels: { article: 'Post' }
      }),
      params: { id: 'org-1' },
      cookies: {}
    } as never);

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });
});
