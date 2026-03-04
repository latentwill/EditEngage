/**
 * @behavior The pipeline run logs endpoint returns step-level logs
 * for a specific pipeline run, ordered by step_index.
 * @business_rule Only users whose organization owns the pipeline can
 * access its run logs. Returns 403 for unauthorized org access.
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
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(terminalValue);
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(terminalValue));
  return chain;
}

let mockAuthUser: { id: string } | null = { id: 'user-1' };
let mockMembershipData: { data: Array<{ org_id: string }> | null; error: unknown };
let mockProjectsData: { data: Array<{ id: string; org_id: string }> | null; error: unknown };
let mockPipelineChain: ReturnType<typeof createChainMock>;
let mockLogsChain: ReturnType<typeof createChainMock>;

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
    if (table === 'pipelines') {
      return mockPipelineChain;
    }
    if (table === 'pipeline_run_logs') {
      return mockLogsChain;
    }
    return createChainMock({ data: null, error: null });
  })
};

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
  createServiceRoleClient: vi.fn(() => mockSupabase)
}));

// --- Helpers ---

function makeCookies() {
  return {
    getAll: vi.fn(() => []),
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    serialize: vi.fn()
  };
}

describe('GET /api/v1/workflows/:id/runs/:runId/logs', () => {
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
    mockPipelineChain = createChainMock({
      data: { id: 'pipeline-1', project_id: 'proj-1' },
      error: null
    });
    mockLogsChain = createChainMock({
      data: [
        { id: 'log-1', pipeline_run_id: 'run-1', step_index: 0, agent_name: 'researcher', status: 'completed', duration_ms: 1200 },
        { id: 'log-2', pipeline_run_id: 'run-1', step_index: 1, agent_name: 'writer', status: 'running', duration_ms: null }
      ],
      error: null
    });
  });

  it('should return logs ordered by step_index', async () => {
    const { GET } = await import('../../routes/api/v1/workflows/[id]/runs/[runId]/logs/+server.js');

    const url = new URL('http://localhost/api/v1/workflows/pipeline-1/runs/run-1/logs');
    const response = await GET({
      cookies: makeCookies(),
      url,
      params: { id: 'pipeline-1', runId: 'run-1' }
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].step_index).toBe(0);
    expect(json.data[1].step_index).toBe(1);
    expect(mockSupabase.from).toHaveBeenCalledWith('pipeline_run_logs');
    expect(mockLogsChain.eq).toHaveBeenCalledWith('pipeline_run_id', 'run-1');
    expect(mockLogsChain.order).toHaveBeenCalledWith('step_index', { ascending: true });
  });

  it('should return empty array for run with no logs', async () => {
    mockLogsChain = createChainMock({
      data: [],
      error: null
    });

    const { GET } = await import('../../routes/api/v1/workflows/[id]/runs/[runId]/logs/+server.js');

    const url = new URL('http://localhost/api/v1/workflows/pipeline-1/runs/run-1/logs');
    const response = await GET({
      cookies: makeCookies(),
      url,
      params: { id: 'pipeline-1', runId: 'run-1' }
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual([]);
  });

  it('should reject access to runs outside user org', async () => {
    // Pipeline belongs to proj-99 which is not in user's orgs
    mockPipelineChain = createChainMock({
      data: { id: 'pipeline-1', project_id: 'proj-99' },
      error: null
    });
    mockProjectsData = {
      data: [{ id: 'proj-1', org_id: 'org-1' }],
      error: null
    };

    const { GET } = await import('../../routes/api/v1/workflows/[id]/runs/[runId]/logs/+server.js');

    const url = new URL('http://localhost/api/v1/workflows/pipeline-1/runs/run-1/logs');
    const response = await GET({
      cookies: makeCookies(),
      url,
      params: { id: 'pipeline-1', runId: 'run-1' }
    } as never);

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('should reject unauthenticated requests', async () => {
    mockAuthUser = null;

    const { GET } = await import('../../routes/api/v1/workflows/[id]/runs/[runId]/logs/+server.js');

    const url = new URL('http://localhost/api/v1/workflows/pipeline-1/runs/run-1/logs');
    const response = await GET({
      cookies: makeCookies(),
      url,
      params: { id: 'pipeline-1', runId: 'run-1' }
    } as never);

    expect(response.status).toBe(401);
  });
});
