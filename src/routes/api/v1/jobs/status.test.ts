/**
 * @behavior GET /api/v1/jobs/:jobId/status returns the current status of a
 * pipeline run, including progress details for in-progress jobs, the final
 * result for completed jobs, and error information for failed jobs.
 * @business_rule Job status is read from the pipeline_runs table. The shape
 * of the response varies by status: in-progress includes step progress,
 * completed includes the result object, and failed includes the error message.
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

let mockChain: ReturnType<typeof createChainMock>;
let mockAuthUser: { id: string } | null = { id: 'user-1' };

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({
      data: { user: mockAuthUser },
      error: mockAuthUser ? null : { message: 'Not authenticated' }
    }))
  },
  from: vi.fn(() => mockChain)
};

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
  createServiceRoleClient: vi.fn(() => mockSupabase)
}));

// --- Helpers ---

function makeStatusRequest(jobId: string): Request {
  return new Request(`http://localhost/api/v1/jobs/${jobId}/status`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('GET /api/v1/jobs/:jobId/status', () => {
  const jobId = 'run-uuid-1';

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
  });

  it('returns { status, currentStep, totalSteps, currentAgent } for in-progress job', async () => {
    mockChain = createChainMock({
      data: {
        id: jobId,
        pipeline_id: 'pipeline-1',
        status: 'running',
        current_step: 1,
        total_steps: 3,
        current_agent: 'writer',
        result: null,
        error: null
      },
      error: null
    });

    const { GET } = await import('./[jobId]/+server.js');

    const request = makeStatusRequest(jobId);
    const response = await GET({
      request,
      params: { jobId }
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      status: 'running',
      currentStep: 1,
      totalSteps: 3,
      currentAgent: 'writer'
    });

    // Verify we queried pipeline_runs
    expect(mockSupabase.from).toHaveBeenCalledWith('pipeline_runs');
    expect(mockChain.eq).toHaveBeenCalledWith('id', jobId);
  });

  it('returns { status: "completed", result: {...} } when job finishes', async () => {
    const resultPayload = { articleId: 'art-1', wordCount: 1500 };

    mockChain = createChainMock({
      data: {
        id: jobId,
        pipeline_id: 'pipeline-1',
        status: 'completed',
        current_step: 3,
        total_steps: 3,
        current_agent: null,
        result: resultPayload,
        error: null
      },
      error: null
    });

    const { GET } = await import('./[jobId]/+server.js');

    const request = makeStatusRequest(jobId);
    const response = await GET({
      request,
      params: { jobId }
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      status: 'completed',
      result: resultPayload
    });
  });

  it('returns { status: "failed", error: "..." } when job fails', async () => {
    mockChain = createChainMock({
      data: {
        id: jobId,
        pipeline_id: 'pipeline-1',
        status: 'failed',
        current_step: 2,
        total_steps: 3,
        current_agent: null,
        result: null,
        error: 'Agent timeout after 30s'
      },
      error: null
    });

    const { GET } = await import('./[jobId]/+server.js');

    const request = makeStatusRequest(jobId);
    const response = await GET({
      request,
      params: { jobId }
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      status: 'failed',
      error: 'Agent timeout after 30s'
    });
  });

  it('returns 404 when job does not exist', async () => {
    mockChain = createChainMock({
      data: null,
      error: { code: 'PGRST116', message: 'Not found' }
    });

    const { GET } = await import('./[jobId]/+server.js');

    const request = makeStatusRequest('nonexistent-id');
    const response = await GET({
      request,
      params: { jobId: 'nonexistent-id' }
    } as never);

    expect(response.status).toBe(404);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockAuthUser = null;
    mockChain = createChainMock({ data: null, error: null });

    const { GET } = await import('./[jobId]/+server.js');

    const request = makeStatusRequest(jobId);
    const response = await GET({
      request,
      params: { jobId }
    } as never);

    expect(response.status).toBe(401);
  });
});
