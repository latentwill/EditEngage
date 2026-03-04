/**
 * @behavior DELETE /api/v1/workflows/:id removes a workflow and its
 * associated runs and logs.
 * @business_rule Only authenticated users whose org membership grants
 * access to the workflow's project may delete the workflow. Cascade
 * deletes run logs, then runs, then the pipeline itself.
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

let mockAuthUser: { id: string } | null = { id: 'user-1' };
let mockMembershipData: { data: Array<{ org_id: string }> | null; error: unknown } = {
  data: [{ org_id: 'org-1' }],
  error: null
};
let mockProjectsData: { data: Array<{ id: string; org_id: string }> | null; error: unknown } = {
  data: [{ id: 'proj-1', org_id: 'org-1' }],
  error: null
};

let tableCallTracker: Record<string, number>;
let tableChains: Record<string, Array<ReturnType<typeof createChainMock>>>;

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
    // Track calls per table for multi-call scenarios
    if (!tableCallTracker[table]) tableCallTracker[table] = 0;
    const idx = tableCallTracker[table];
    tableCallTracker[table]++;
    const chains = tableChains[table];
    if (chains && chains[idx]) return chains[idx];
    if (chains && chains.length > 0) return chains[chains.length - 1];
    return createChainMock({ data: null, error: null });
  })
};

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
  createServiceRoleClient: vi.fn(() => mockSupabase)
}));

// --- Helpers ---

function makeDeleteRequest(id: string): Request {
  return new Request(`http://localhost/api/v1/workflows/${id}`, {
    method: 'DELETE',
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

describe('DELETE /api/v1/workflows/:id', () => {
  beforeEach(() => {
    vi.resetModules();
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
    tableCallTracker = {};
    tableChains = {};
  });

  it('should delete a workflow owned by the user', async () => {
    // pipelines call 1: select to fetch pipeline (auth check)
    const selectPipelineChain = createChainMock({
      data: { ...basePipeline },
      error: null
    });

    // pipeline_runs: select to get run IDs
    const selectRunsChain = createChainMock({
      data: [{ id: 'run-1' }, { id: 'run-2' }],
      error: null
    });

    // pipeline_run_logs: delete logs by run IDs
    const deleteLogsChain = createChainMock({
      data: null,
      error: null
    });

    // pipeline_runs: delete runs by pipeline_id
    const deleteRunsChain = createChainMock({
      data: null,
      error: null
    });

    // pipelines call 2: delete pipeline
    const deletePipelineChain = createChainMock({
      data: null,
      error: null
    });

    tableChains['pipelines'] = [selectPipelineChain, deletePipelineChain];
    tableChains['pipeline_runs'] = [selectRunsChain, deleteRunsChain];
    tableChains['pipeline_run_logs'] = [deleteLogsChain];

    const { DELETE } = await import('./+server.js');

    const request = makeDeleteRequest('pipeline-1');
    const response = await DELETE({
      request,
      params: { id: 'pipeline-1' },
      cookies: {}
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);

    // Verify cascade delete order: logs first, then runs, then pipeline
    expect(deleteLogsChain.in).toHaveBeenCalledWith('pipeline_run_id', ['run-1', 'run-2']);
    expect(deleteRunsChain.eq).toHaveBeenCalledWith('pipeline_id', 'pipeline-1');
    expect(deletePipelineChain.eq).toHaveBeenCalledWith('id', 'pipeline-1');
  });

  it('should return 401 when not authenticated', async () => {
    mockAuthUser = null;

    const { DELETE } = await import('./+server.js');

    const request = makeDeleteRequest('pipeline-1');
    const response = await DELETE({
      request,
      params: { id: 'pipeline-1' },
      cookies: {}
    } as never);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('should return 404 for non-existent workflow', async () => {
    tableChains['pipelines'] = [createChainMock({
      data: null,
      error: { message: 'Not found', code: 'PGRST116' }
    })];

    const { DELETE } = await import('./+server.js');

    const request = makeDeleteRequest('nonexistent-id');
    const response = await DELETE({
      request,
      params: { id: 'nonexistent-id' },
      cookies: {}
    } as never);

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('should return 404 for workflow not owned by user', async () => {
    // Pipeline belongs to proj-other, user only has access to proj-1
    const selectPipelineChain = createChainMock({
      data: { ...basePipeline, project_id: 'proj-other' },
      error: null
    });

    tableChains['pipelines'] = [selectPipelineChain];

    const { DELETE } = await import('./+server.js');

    const request = makeDeleteRequest('pipeline-1');
    const response = await DELETE({
      request,
      params: { id: 'pipeline-1' },
      cookies: {}
    } as never);

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toBe('Pipeline not found');
  });
});
