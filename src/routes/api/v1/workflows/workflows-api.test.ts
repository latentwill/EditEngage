/**
 * @behavior Workflow CRUD API routes create and list workflows
 * scoped to the authenticated user's projects (via organization membership).
 * @business_rule Workflows belong to projects; only users who are members of
 * the project's organization can create or list workflows.
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

let mockPipelinesChain: ReturnType<typeof createChainMock>;
let mockAuthUser: { id: string } | null = { id: 'user-1' };
let mockMembershipData: { data: Array<{ org_id: string; role: string }> | null; error: unknown } = {
  data: [{ org_id: 'org-1', role: 'owner' }],
  error: null
};
let mockProjectsData: { data: Array<{ id: string; org_id: string }> | null; error: unknown } = {
  data: [{ id: 'proj-1', org_id: 'org-1' }],
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
    if (table === 'projects') {
      return createChainMock(mockProjectsData);
    }
    return mockPipelinesChain;
  })
};

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
  createServiceRoleClient: vi.fn(() => mockSupabase)
}));

// --- Helpers ---

function makeRequest(method: string, body?: Record<string, unknown>, url?: string): Request {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new Request(url ?? 'http://localhost/api/v1/workflows', init);
}

describe('POST /api/v1/workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockMembershipData = {
      data: [{ org_id: 'org-1', role: 'owner' }],
      error: null
    };
    mockProjectsData = {
      data: [{ id: 'proj-1', org_id: 'org-1' }],
      error: null
    };
    mockPipelinesChain = createChainMock({
      data: {
        id: 'pipeline-new',
        project_id: 'proj-1',
        name: 'My Workflow',
        description: null,
        schedule: null,
        review_mode: 'draft_for_review',
        is_active: true,
        steps: {}
      },
      error: null
    });
  });

  it('creates a pipeline and returns 201', async () => {
    const { POST } = await import('./+server.js');

    const request = makeRequest('POST', {
      project_id: 'proj-1',
      name: 'My Workflow'
    });

    const response = await POST({ request } as never);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.name).toBe('My Workflow');
    expect(json.data.project_id).toBe('proj-1');
    expect(mockSupabase.from).toHaveBeenCalledWith('pipelines');
    expect(mockPipelinesChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 'proj-1',
        name: 'My Workflow'
      })
    );
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuthUser = null;

    const { POST } = await import('./+server.js');

    const request = makeRequest('POST', {
      project_id: 'proj-1',
      name: 'My Workflow'
    });

    const response = await POST({ request } as never);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('returns 403 when user does not have access to the project', async () => {
    // User belongs to org-1 but proj-99 belongs to org-99
    mockProjectsData = {
      data: [{ id: 'proj-1', org_id: 'org-1' }],
      error: null
    };

    const { POST } = await import('./+server.js');

    const request = makeRequest('POST', {
      project_id: 'proj-99',
      name: 'Sneaky Pipeline'
    });

    const response = await POST({ request } as never);

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });
});

describe('GET /api/v1/workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockMembershipData = {
      data: [{ org_id: 'org-1', role: 'member' }],
      error: null
    };
    mockProjectsData = {
      data: [
        { id: 'proj-1', org_id: 'org-1' },
        { id: 'proj-2', org_id: 'org-1' }
      ],
      error: null
    };
    mockPipelinesChain = createChainMock({
      data: [
        { id: 'pipeline-1', project_id: 'proj-1', name: 'Workflow Alpha' },
        { id: 'pipeline-2', project_id: 'proj-2', name: 'Workflow Beta' }
      ],
      error: null
    });
  });

  it('returns pipelines for user projects', async () => {
    const { GET } = await import('./+server.js');

    const request = makeRequest('GET');
    const url = new URL('http://localhost/api/v1/workflows');
    const response = await GET({ request, url } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(2);
    expect(mockSupabase.from).toHaveBeenCalledWith('pipelines');
    expect(mockPipelinesChain.in).toHaveBeenCalledWith('project_id', ['proj-1', 'proj-2']);
  });

  it('filters by project_id query param when provided', async () => {
    const { GET } = await import('./+server.js');

    const request = makeRequest('GET');
    const url = new URL('http://localhost/api/v1/workflows?project_id=proj-1');
    const response = await GET({ request, url } as never);

    expect(response.status).toBe(200);
    expect(mockPipelinesChain.eq).toHaveBeenCalledWith('project_id', 'proj-1');
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuthUser = null;

    const { GET } = await import('./+server.js');

    const request = makeRequest('GET');
    const url = new URL('http://localhost/api/v1/workflows');
    const response = await GET({ request, url } as never);

    expect(response.status).toBe(401);
  });
});
