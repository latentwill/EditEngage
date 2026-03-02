/**
 * @behavior POST /api/v1/research/:id/run enqueues a BullMQ research job
 * and returns a jobId immediately without blocking the response.
 * @business_rule Research query runs are fire-and-forget: the API updates
 * the query status, enqueues the job, and returns so the client can poll separately.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

const mockAddResearchJob = vi.fn();

vi.mock('$lib/server/researchQueue', () => ({
  addResearchJob: mockAddResearchJob
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

let mockResearchQueryChain: ReturnType<typeof createChainMock>;
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
    if (table === 'research_queries') {
      return mockResearchQueryChain;
    }
    if (table === 'organization_members') {
      return createChainMock(mockMembershipData);
    }
    if (table === 'projects') {
      return createChainMock(mockProjectsData);
    }
    return createChainMock({ data: null, error: null });
  })
};

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
  createServiceRoleClient: vi.fn(() => mockSupabase)
}));

// --- Helpers ---

function makeRunRequest(queryId: string): Request {
  return new Request(`http://localhost/api/v1/research/${queryId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('POST /api/v1/research/:id/run', () => {
  const queryId = 'research-query-1';
  const jobId = 'job-research-1';

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

    mockResearchQueryChain = createChainMock({
      data: {
        id: queryId,
        name: 'SEO Research',
        project_id: 'proj-1',
        status: 'active',
        provider_chain: [{ provider: 'perplexity', role: 'discovery' }]
      },
      error: null
    });

    mockAddResearchJob.mockResolvedValue({ id: jobId });
  });

  it('enqueues a BullMQ research job and returns 202 with jobId', async () => {
    const { POST } = await import('./[id]/run/+server.js');

    const request = makeRunRequest(queryId);
    const response = await POST({
      request,
      params: { id: queryId }
    } as never);
    const json = await response.json();

    expect(response.status).toBe(202);
    expect(json.jobId).toBe(jobId);

    // Verify research query was looked up
    expect(mockSupabase.from).toHaveBeenCalledWith('research_queries');
    expect(mockResearchQueryChain.eq).toHaveBeenCalledWith('id', queryId);

    // Verify status was updated to running
    expect(mockResearchQueryChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'running' })
    );

    // Verify job was enqueued
    expect(mockAddResearchJob).toHaveBeenCalledWith(
      expect.objectContaining({
        queryId,
        providerChain: [{ provider: 'perplexity', role: 'discovery' }]
      })
    );
  });

  it('returns 401 when user is not authenticated', async () => {
    mockAuthUser = null;

    const { POST } = await import('./[id]/run/+server.js');

    const request = makeRunRequest(queryId);
    const response = await POST({
      request,
      params: { id: queryId }
    } as never);

    expect(response.status).toBe(401);
  });

  it('returns 404 when user does not own the query project', async () => {
    // Query belongs to proj-other, user only has access to proj-1
    mockResearchQueryChain = createChainMock({
      data: {
        id: queryId,
        name: 'SEO Research',
        project_id: 'proj-other',
        status: 'active',
        provider_chain: [{ provider: 'perplexity', role: 'discovery' }]
      },
      error: null
    });

    const { POST } = await import('./[id]/run/+server.js');

    const request = makeRunRequest(queryId);
    const response = await POST({
      request,
      params: { id: queryId }
    } as never);

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toBe('Research query not found');

    // Verify job was NOT enqueued
    expect(mockAddResearchJob).not.toHaveBeenCalled();
  });

  it('returns 404 when research query is not found', async () => {
    mockResearchQueryChain = createChainMock({
      data: null,
      error: { message: 'Not found' }
    });

    const { POST } = await import('./[id]/run/+server.js');

    const request = makeRunRequest('nonexistent-id');
    const response = await POST({
      request,
      params: { id: 'nonexistent-id' }
    } as never);

    expect(response.status).toBe(404);
  });
});
