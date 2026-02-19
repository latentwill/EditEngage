/**
 * @behavior POST /api/v1/workflows/:id/run enqueues a BullMQ workflow job
 * and returns a jobId immediately without blocking the response.
 * @business_rule Workflow runs are fire-and-forget: the API creates a
 * pipeline_runs record, enqueues the job, and returns within 200ms so the
 * client can poll for status separately.
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

// --- Mock queue ---
const mockAddPipelineJob = vi.fn();

vi.mock('$lib/server/queue', () => ({
  addPipelineJob: mockAddPipelineJob
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

let mockPipelineChain: ReturnType<typeof createChainMock>;
let mockPipelineRunChain: ReturnType<typeof createChainMock>;
let mockAuthUser: { id: string } | null = { id: 'user-1' };

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({
      data: { user: mockAuthUser },
      error: mockAuthUser ? null : { message: 'Not authenticated' }
    }))
  },
  from: vi.fn((table: string) => {
    if (table === 'pipelines') {
      return mockPipelineChain;
    }
    if (table === 'pipeline_runs') {
      return mockPipelineRunChain;
    }
    return createChainMock({ data: null, error: null });
  })
};

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
  createServiceRoleClient: vi.fn(() => mockSupabase)
}));

// --- Helpers ---

function makeRunRequest(pipelineId: string): Request {
  return new Request(`http://localhost/api/v1/workflows/${pipelineId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('POST /api/v1/workflows/:id/run', () => {
  const pipelineId = 'pipeline-1';
  const pipelineRunId = 'run-uuid-1';
  const jobId = 'job-123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };

    // Pipeline lookup returns a pipeline with steps
    mockPipelineChain = createChainMock({
      data: {
        id: pipelineId,
        org_id: 'org-1',
        name: 'Content Pipeline',
        steps: [
          { agentType: 'researcher', config: {} },
          { agentType: 'writer', config: {} }
        ]
      },
      error: null
    });

    // Pipeline run insert returns the new record
    mockPipelineRunChain = createChainMock({
      data: {
        id: pipelineRunId,
        pipeline_id: pipelineId,
        status: 'queued',
        current_step: 0,
        total_steps: 2
      },
      error: null
    });

    // Queue returns a job id
    mockAddPipelineJob.mockResolvedValue({ id: jobId });
  });

  it('enqueues a BullMQ job and returns { jobId }', async () => {
    const { POST } = await import('./[id]/run/+server.js');

    const request = makeRunRequest(pipelineId);
    const response = await POST({
      request,
      params: { id: pipelineId }
    } as never);
    const json = await response.json();

    expect(response.status).toBe(202);
    expect(json.jobId).toBe(pipelineRunId);

    // Verify pipeline was loaded
    expect(mockSupabase.from).toHaveBeenCalledWith('pipelines');
    expect(mockPipelineChain.eq).toHaveBeenCalledWith('id', pipelineId);

    // Verify pipeline_runs record was created
    expect(mockSupabase.from).toHaveBeenCalledWith('pipeline_runs');
    expect(mockPipelineRunChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        pipeline_id: pipelineId,
        status: 'queued'
      })
    );

    // Verify job was enqueued with correct data
    expect(mockAddPipelineJob).toHaveBeenCalledWith(
      expect.objectContaining({
        pipelineId,
        pipelineRunId,
        steps: [
          { agentType: 'researcher', config: {} },
          { agentType: 'writer', config: {} }
        ]
      })
    );
  });

  it('responds within 200ms (non-blocking)', async () => {
    const { POST } = await import('./[id]/run/+server.js');

    const request = makeRunRequest(pipelineId);
    const start = performance.now();
    const response = await POST({
      request,
      params: { id: pipelineId }
    } as never);
    const elapsed = performance.now() - start;

    expect(response.status).toBe(202);
    expect(elapsed).toBeLessThan(200);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockAuthUser = null;

    const { POST } = await import('./[id]/run/+server.js');

    const request = makeRunRequest(pipelineId);
    const response = await POST({
      request,
      params: { id: pipelineId }
    } as never);

    expect(response.status).toBe(401);
  });
});
