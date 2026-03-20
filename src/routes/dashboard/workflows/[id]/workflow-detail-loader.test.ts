/**
 * @behavior Workflow detail loader fetches a single workflow by ID with its recent run history
 * @business_rule Users can view workflow details and run history; a 404 is thrown if the workflow does not exist
 * @business_rule Run logs (steps) are loaded for each run so the UI can display step-level detail
 * @business_rule Failed runs include their error message for user visibility
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

const mockRunLogs = [
  {
    id: 'log-1',
    pipeline_run_id: 'run-1',
    step_index: 0,
    agent_name: 'researcher',
    status: 'completed',
    log_output: 'Research complete'
  },
  {
    id: 'log-2',
    pipeline_run_id: 'run-1',
    step_index: 1,
    agent_name: 'writer',
    status: 'completed',
    log_output: 'Draft written'
  },
  {
    id: 'log-3',
    pipeline_run_id: 'run-2',
    step_index: 0,
    agent_name: 'researcher',
    status: 'completed',
    log_output: 'Research complete'
  },
  {
    id: 'log-4',
    pipeline_run_id: 'run-2',
    step_index: 1,
    agent_name: 'writer',
    status: 'failed',
    log_output: 'Connection timeout'
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

// Chainable mock for run logs query (with .in().order())
function createLogsQueryMock(returnData: unknown[]) {
  const mockOrder = vi.fn().mockResolvedValue({ data: returnData, error: null });
  const mockIn = vi.fn().mockReturnValue({ order: mockOrder });
  const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
  return { select: mockSelect, in: mockIn, order: mockOrder };
}

// Chainable mock for events query (with .eq().order().limit())
function createEventsQueryMock(returnData: unknown[]) {
  const mockLimit = vi.fn().mockResolvedValue({ data: returnData, error: null });
  const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  return { select: mockSelect, eq: mockEq, order: mockOrder, limit: mockLimit };
}

let pipelineQuery: ReturnType<typeof createPipelineQueryMock>;
let runsQuery: ReturnType<typeof createRunsQueryMock>;
let logsQuery: ReturnType<typeof createLogsQueryMock>;
let eventsQuery: ReturnType<typeof createEventsQueryMock>;
let mockAuthUser: { id: string } | null = { id: 'user-1' };
let mockMemberships: Array<{ org_id: string }> = [{ org_id: 'org-1' }];
let mockUserProjects: Array<{ id: string; org_id: string }> = [{ id: 'proj-1', org_id: 'org-1' }];

// Chainable mock for organization_members query
function createMembershipsQueryMock(data: unknown[]) {
  const mockEq = vi.fn().mockResolvedValue({ data, error: null });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  return { select: mockSelect, eq: mockEq };
}

// Chainable mock for projects query (with .in())
function createProjectsQueryMock(data: unknown[]) {
  const mockIn = vi.fn().mockResolvedValue({ data, error: null });
  const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
  return { select: mockSelect, in: mockIn };
}

let membershipsQuery: ReturnType<typeof createMembershipsQueryMock>;
let projectsQuery: ReturnType<typeof createProjectsQueryMock>;

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: mockAuthUser },
          error: mockAuthUser ? null : { message: 'Not authenticated' }
        })
      )
    },
    from: vi.fn((table: string) => {
      if (table === 'pipelines') return { select: pipelineQuery.select };
      if (table === 'pipeline_runs') return { select: runsQuery.select };
      if (table === 'pipeline_run_logs') return { select: logsQuery.select };
      if (table === 'events') return { select: eventsQuery.select };
      if (table === 'organization_members') return { select: membershipsQuery.select };
      if (table === 'projects') return { select: projectsQuery.select };
      return { select: vi.fn() };
    })
  }))
}));

describe('Workflow Detail Loader', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockMemberships = [{ org_id: 'org-1' }];
    mockUserProjects = [{ id: 'proj-1', org_id: 'org-1' }];
    eventsQuery = createEventsQueryMock([]);
    membershipsQuery = createMembershipsQueryMock(mockMemberships);
    projectsQuery = createProjectsQueryMock(mockUserProjects);
  });

  it('should load workflow by id with run history', async () => {
    pipelineQuery = createPipelineQueryMock(mockPipeline);
    runsQuery = createRunsQueryMock(mockRuns);
    logsQuery = createLogsQueryMock(mockRunLogs);

    const { load } = await import('./+page.server');

    const result = await load({
      params: { id: 'pipe-1' },
      cookies: {} as never
    } as never) as Record<string, unknown>;

    // Verify pipeline query
    expect(pipelineQuery.select).toHaveBeenCalledWith('*');
    expect(pipelineQuery.eq).toHaveBeenCalledWith('id', 'pipe-1');
    expect(pipelineQuery.single).toHaveBeenCalled();

    // Verify runs query
    expect(runsQuery.select).toHaveBeenCalledWith('*');
    expect(runsQuery.eq).toHaveBeenCalledWith('pipeline_id', 'pipe-1');
    expect(runsQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(runsQuery.limit).toHaveBeenCalledWith(20);

    // Verify returned data includes workflow and runs
    expect(result.workflow).toEqual(mockPipeline);
    expect((result.runs as unknown[]).length).toBe(2);
  });

  it('should throw 404 when workflow not found', async () => {
    pipelineQuery = createPipelineQueryMock(null, { code: 'PGRST116', message: 'not found' });
    runsQuery = createRunsQueryMock([]);
    logsQuery = createLogsQueryMock([]);

    const { load } = await import('./+page.server');

    await expect(
      load({
        params: { id: 'nonexistent' },
        cookies: {} as never
      } as never)
    ).rejects.toThrow();
  });

  it('should include pipeline_run_logs as steps for each run', async () => {
    pipelineQuery = createPipelineQueryMock(mockPipeline);
    runsQuery = createRunsQueryMock(mockRuns);
    logsQuery = createLogsQueryMock(mockRunLogs);

    const { load } = await import('./+page.server');

    const result = await load({
      params: { id: 'pipe-1' },
      cookies: {} as never
    } as never) as Record<string, unknown>;

    // Verify logs query was made with the run IDs
    expect(logsQuery.select).toHaveBeenCalledWith('*');
    expect(logsQuery.in).toHaveBeenCalledWith('pipeline_run_id', ['run-1', 'run-2']);
    expect(logsQuery.order).toHaveBeenCalledWith('step_index', { ascending: true });

    // Each run should have steps populated from pipeline_run_logs
    const runs = result.runs as Array<Record<string, unknown>>;
    const run1 = runs.find((r) => r.id === 'run-1') as Record<string, unknown>;
    const run2 = runs.find((r) => r.id === 'run-2') as Record<string, unknown>;

    const run1Steps = run1.steps as Array<Record<string, unknown>>;
    expect(run1Steps).toHaveLength(2);
    expect(run1Steps[0].agent_name).toBe('researcher');
    expect(run1Steps[1].agent_name).toBe('writer');

    const run2Steps = run2.steps as Array<Record<string, unknown>>;
    expect(run2Steps).toHaveLength(2);
    expect(run2Steps[0].agent_name).toBe('researcher');
    expect(run2Steps[1].agent_name).toBe('writer');
  });

  it('should include error field from pipeline_runs', async () => {
    const failedRun = {
      id: 'run-fail',
      pipeline_id: 'pipe-1',
      status: 'failed',
      current_step: 1,
      total_steps: 3,
      started_at: '2025-01-09T08:00:00Z',
      completed_at: '2025-01-09T08:02:00Z',
      result: null,
      error: 'Timeout connecting to LLM',
      bullmq_job_id: 'job-fail',
      created_at: '2025-01-09T08:00:00Z'
    };

    pipelineQuery = createPipelineQueryMock(mockPipeline);
    runsQuery = createRunsQueryMock([failedRun]);
    logsQuery = createLogsQueryMock([]);

    const { load } = await import('./+page.server');

    const result = await load({
      params: { id: 'pipe-1' },
      cookies: {} as never
    } as never) as Record<string, unknown>;

    const run = (result.runs as Array<Record<string, unknown>>)[0];
    expect(run.error).toBe('Timeout connecting to LLM');
    expect(run.status).toBe('failed');
  });

  it('should order steps by step_index ascending', async () => {
    // Provide logs in reversed order to verify sorting
    const unorderedLogs = [
      {
        id: 'log-b',
        pipeline_run_id: 'run-1',
        step_index: 2,
        agent_name: 'publisher',
        status: 'completed',
        log_output: 'Published'
      },
      {
        id: 'log-a',
        pipeline_run_id: 'run-1',
        step_index: 0,
        agent_name: 'researcher',
        status: 'completed',
        log_output: 'Research complete'
      },
      {
        id: 'log-c',
        pipeline_run_id: 'run-1',
        step_index: 1,
        agent_name: 'writer',
        status: 'completed',
        log_output: 'Draft written'
      }
    ];

    pipelineQuery = createPipelineQueryMock(mockPipeline);
    runsQuery = createRunsQueryMock([mockRuns[0]]);
    logsQuery = createLogsQueryMock(unorderedLogs);

    const { load } = await import('./+page.server');

    const result = await load({
      params: { id: 'pipe-1' },
      cookies: {} as never
    } as never) as Record<string, unknown>;

    const run = (result.runs as Array<Record<string, unknown>>)[0];
    const steps = run.steps as Array<Record<string, unknown>>;
    expect(steps).toHaveLength(3);
    expect(steps[0].step_index).toBe(0);
    expect(steps[0].agent_name).toBe('researcher');
    expect(steps[1].step_index).toBe(1);
    expect(steps[1].agent_name).toBe('writer');
    expect(steps[2].step_index).toBe(2);
    expect(steps[2].agent_name).toBe('publisher');
  });

  it('should throw 404 when user does not own the workflow project', async () => {
    // Pipeline exists but belongs to proj-other, user only has access to proj-1
    const otherPipeline = { ...mockPipeline, project_id: 'proj-other' };
    pipelineQuery = createPipelineQueryMock(otherPipeline);
    runsQuery = createRunsQueryMock([]);
    logsQuery = createLogsQueryMock([]);
    mockUserProjects = [{ id: 'proj-1', org_id: 'org-1' }];
    membershipsQuery = createMembershipsQueryMock(mockMemberships);
    projectsQuery = createProjectsQueryMock(mockUserProjects);

    const { load } = await import('./+page.server');

    await expect(
      load({
        params: { id: 'pipe-1' },
        cookies: {} as never
      } as never)
    ).rejects.toThrow();
  });

  it('should throw 401 when user is not authenticated', async () => {
    mockAuthUser = null;
    pipelineQuery = createPipelineQueryMock(mockPipeline);
    runsQuery = createRunsQueryMock([]);
    logsQuery = createLogsQueryMock([]);

    const { load } = await import('./+page.server');

    await expect(
      load({
        params: { id: 'pipe-1' },
        cookies: {} as never
      } as never)
    ).rejects.toThrow();
  });
});
