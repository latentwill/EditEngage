/**
 * @behavior Workflow detail loader fetches a single workflow by ID with its recent run history
 * @business_rule Users can view workflow details and run history; a 404 is thrown if the workflow does not exist
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment variables
vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

const mockPipeline = {
  id: 'pipe-1',
  project_id: 'proj-1',
  name: 'SEO Writer',
  description: 'Generates SEO articles',
  schedule: '0 6 * * *',
  review_mode: 'draft_for_review',
  is_active: true,
  steps: [{ agentType: 'researcher', config: {} }],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-10T00:00:00Z',
  last_run_at: '2025-01-10T10:00:00Z'
};

const mockRuns = [
  {
    id: 'run-1',
    pipeline_id: 'pipe-1',
    status: 'completed',
    current_step: 3,
    total_steps: 3,
    started_at: '2025-01-10T10:00:00Z',
    completed_at: '2025-01-10T10:05:00Z',
    result: { output: 'Article generated' },
    error: null,
    bullmq_job_id: 'job-1',
    created_at: '2025-01-10T10:00:00Z'
  },
  {
    id: 'run-2',
    pipeline_id: 'pipe-1',
    status: 'failed',
    current_step: 2,
    total_steps: 3,
    started_at: '2025-01-09T08:00:00Z',
    completed_at: '2025-01-09T08:02:00Z',
    result: null,
    error: 'Timeout connecting to LLM',
    bullmq_job_id: 'job-2',
    created_at: '2025-01-09T08:00:00Z'
  }
];

// Chainable mock for pipeline query (with .single())
function createPipelineQueryMock(returnData: unknown, returnError: unknown = null) {
  const mockSingle = vi.fn().mockResolvedValue({ data: returnData, error: returnError });
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  return { select: mockSelect, eq: mockEq, single: mockSingle };
}

// Chainable mock for runs query (with .order().limit())
function createRunsQueryMock(returnData: unknown[]) {
  const mockLimit = vi.fn().mockResolvedValue({ data: returnData, error: null });
  const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  return { select: mockSelect, eq: mockEq, order: mockOrder, limit: mockLimit };
}

let pipelineQuery: ReturnType<typeof createPipelineQueryMock>;
let runsQuery: ReturnType<typeof createRunsQueryMock>;

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'pipelines') return { select: pipelineQuery.select };
      if (table === 'pipeline_runs') return { select: runsQuery.select };
      return { select: vi.fn() };
    })
  }))
}));

describe('Workflow Detail Loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load workflow by id with run history', async () => {
    pipelineQuery = createPipelineQueryMock(mockPipeline);
    runsQuery = createRunsQueryMock(mockRuns);

    const { load } = await import('./+page.server');

    const result = await load({
      params: { id: 'pipe-1' },
      cookies: {} as never
    } as never);

    // Verify pipeline query
    expect(pipelineQuery.select).toHaveBeenCalledWith('*');
    expect(pipelineQuery.eq).toHaveBeenCalledWith('id', 'pipe-1');
    expect(pipelineQuery.single).toHaveBeenCalled();

    // Verify runs query
    expect(runsQuery.select).toHaveBeenCalledWith('*');
    expect(runsQuery.eq).toHaveBeenCalledWith('pipeline_id', 'pipe-1');
    expect(runsQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(runsQuery.limit).toHaveBeenCalledWith(20);

    // Verify returned data
    expect(result).toEqual({
      pipeline: mockPipeline,
      runs: mockRuns
    });
  });

  it('should throw 404 when workflow not found', async () => {
    pipelineQuery = createPipelineQueryMock(null, { code: 'PGRST116', message: 'not found' });
    runsQuery = createRunsQueryMock([]);

    const { load } = await import('./+page.server');

    await expect(
      load({
        params: { id: 'nonexistent' },
        cookies: {} as never
      } as never)
    ).rejects.toThrow();
  });
});
