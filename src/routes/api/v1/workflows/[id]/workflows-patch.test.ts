/**
 * @behavior PATCH /api/v1/workflows/:id toggles is_active and updates
 * editable fields; GET /api/v1/workflows/:id returns a single workflow.
 * @business_rule Only authenticated users whose org membership grants
 * access to the workflow's project may update or view the workflow.
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
let mockMembershipData: { data: Array<{ org_id: string }> | null; error: unknown } = {
  data: [{ org_id: 'org-1' }],
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

function makePatchRequest(id: string, body: Record<string, unknown>): Request {
  return new Request(`http://localhost/api/v1/workflows/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

function makeGetRequest(id: string): Request {
  return new Request(`http://localhost/api/v1/workflows/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
}

const basePipeline = {
  id: 'pipeline-1',
  project_id: 'proj-1',
  name: 'Test Workflow',
  description: 'A test workflow',
  schedule: null,
  review_mode: 'draft_for_review',
  is_active: true,
  steps: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
};

function resetFromMock() {
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'organization_members') {
      return createChainMock(mockMembershipData);
    }
    if (table === 'projects') {
      return createChainMock(mockProjectsData);
    }
    return mockPipelinesChain;
  });
}

describe('PATCH /api/v1/workflows/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockMembershipData = {
      data: [{ org_id: 'org-1' }],
      error: null
    };
    mockProjectsData = {
      data: [{ id: 'proj-1', org_id: 'org-1' }],
      error: null
    };
    resetFromMock();
  });

  it('toggles is_active and returns updated workflow', async () => {
    // First call: select to fetch pipeline (for auth check)
    // Second call: update chain
    const selectChain = createChainMock({
      data: { ...basePipeline, is_active: true },
      error: null
    });
    const updateChain = createChainMock({
      data: { ...basePipeline, is_active: false },
      error: null
    });

    let pipelineCallCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'organization_members') {
        return createChainMock(mockMembershipData);
      }
      if (table === 'projects') {
        return createChainMock(mockProjectsData);
      }
      // pipelines table: first call is select (auth check), second is update
      pipelineCallCount++;
      if (pipelineCallCount === 1) return selectChain;
      return updateChain;
    });

    const { PATCH } = await import('./+server.js');

    const request = makePatchRequest('pipeline-1', { is_active: false });
    const response = await PATCH({
      request,
      params: { id: 'pipeline-1' },
      cookies: {}
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.is_active).toBe(false);
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false })
    );
  });

  it('updates name and description fields', async () => {
    const selectChain = createChainMock({
      data: { ...basePipeline },
      error: null
    });
    const updateChain = createChainMock({
      data: { ...basePipeline, name: 'Updated Name', description: 'Updated desc' },
      error: null
    });

    let pipelineCallCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'organization_members') return createChainMock(mockMembershipData);
      if (table === 'projects') return createChainMock(mockProjectsData);
      pipelineCallCount++;
      if (pipelineCallCount === 1) return selectChain;
      return updateChain;
    });

    const { PATCH } = await import('./+server.js');

    const request = makePatchRequest('pipeline-1', {
      name: 'Updated Name',
      description: 'Updated desc'
    });
    const response = await PATCH({
      request,
      params: { id: 'pipeline-1' },
      cookies: {}
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.name).toBe('Updated Name');
    expect(json.data.description).toBe('Updated desc');
  });

  it('returns 404 when pipeline is not found', async () => {
    mockPipelinesChain = createChainMock({
      data: null,
      error: { message: 'Not found', code: 'PGRST116' }
    });

    const { PATCH } = await import('./+server.js');

    const request = makePatchRequest('nonexistent-id', { is_active: false });
    const response = await PATCH({
      request,
      params: { id: 'nonexistent-id' },
      cookies: {}
    } as never);

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockAuthUser = null;

    const { PATCH } = await import('./+server.js');

    const request = makePatchRequest('pipeline-1', { is_active: false });
    const response = await PATCH({
      request,
      params: { id: 'pipeline-1' },
      cookies: {}
    } as never);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('returns 404 when user does not have access to the pipeline project', async () => {
    // User belongs to org-1 which has proj-1, but pipeline belongs to proj-other
    const selectChain = createChainMock({
      data: { ...basePipeline, project_id: 'proj-other' },
      error: null
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'organization_members') return createChainMock(mockMembershipData);
      if (table === 'projects') return createChainMock(mockProjectsData);
      return selectChain;
    });

    const { PATCH } = await import('./+server.js');

    const request = makePatchRequest('pipeline-1', { is_active: false });
    const response = await PATCH({
      request,
      params: { id: 'pipeline-1' },
      cookies: {}
    } as never);

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toBe('Pipeline not found');
  });

  it('returns 400 when name exceeds 255 characters', async () => {
    const selectChain = createChainMock({
      data: { ...basePipeline },
      error: null
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'organization_members') return createChainMock(mockMembershipData);
      if (table === 'projects') return createChainMock(mockProjectsData);
      return selectChain;
    });

    const { PATCH } = await import('./+server.js');

    const longName = 'a'.repeat(256);
    const request = makePatchRequest('pipeline-1', { name: longName });
    const response = await PATCH({
      request,
      params: { id: 'pipeline-1' },
      cookies: {}
    } as never);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('name');
  });

  it('returns 400 when description exceeds 5000 characters', async () => {
    const selectChain = createChainMock({
      data: { ...basePipeline },
      error: null
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'organization_members') return createChainMock(mockMembershipData);
      if (table === 'projects') return createChainMock(mockProjectsData);
      return selectChain;
    });

    const { PATCH } = await import('./+server.js');

    const longDesc = 'a'.repeat(5001);
    const request = makePatchRequest('pipeline-1', { description: longDesc });
    const response = await PATCH({
      request,
      params: { id: 'pipeline-1' },
      cookies: {}
    } as never);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('description');
  });
});

describe('GET /api/v1/workflows/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockMembershipData = {
      data: [{ org_id: 'org-1' }],
      error: null
    };
    mockProjectsData = {
      data: [{ id: 'proj-1', org_id: 'org-1' }],
      error: null
    };
    mockPipelinesChain = createChainMock({
      data: { ...basePipeline },
      error: null
    });
    resetFromMock();
  });

  it('returns a single workflow by id', async () => {
    const { GET } = await import('./+server.js');

    const request = makeGetRequest('pipeline-1');
    const response = await GET({
      request,
      params: { id: 'pipeline-1' },
      cookies: {}
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.id).toBe('pipeline-1');
    expect(json.data.name).toBe('Test Workflow');
    expect(mockSupabase.from).toHaveBeenCalledWith('pipelines');
    expect(mockPipelinesChain.eq).toHaveBeenCalledWith('id', 'pipeline-1');
  });

  it('returns 404 when pipeline is not found', async () => {
    mockPipelinesChain = createChainMock({
      data: null,
      error: { message: 'Not found', code: 'PGRST116' }
    });

    const { GET } = await import('./+server.js');

    const request = makeGetRequest('nonexistent-id');
    const response = await GET({
      request,
      params: { id: 'nonexistent-id' },
      cookies: {}
    } as never);

    expect(response.status).toBe(404);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockAuthUser = null;

    const { GET } = await import('./+server.js');

    const request = makeGetRequest('pipeline-1');
    const response = await GET({
      request,
      params: { id: 'pipeline-1' },
      cookies: {}
    } as never);

    expect(response.status).toBe(401);
  });

  it('returns 404 when user does not have access to the pipeline project', async () => {
    // Pipeline belongs to proj-other, user only has access to proj-1
    mockPipelinesChain = createChainMock({
      data: { ...basePipeline, project_id: 'proj-other' },
      error: null
    });
    resetFromMock();

    const { GET } = await import('./+server.js');

    const request = makeGetRequest('pipeline-1');
    const response = await GET({
      request,
      params: { id: 'pipeline-1' },
      cookies: {}
    } as never);

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toBe('Pipeline not found');
  });
});
