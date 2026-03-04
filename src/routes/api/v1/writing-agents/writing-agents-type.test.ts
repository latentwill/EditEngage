/**
 * @behavior GET /api/v1/writing-agents returns both writing and research agents
 * tagged with their respective type so the wizard can filter them correctly
 * @business_rule The wizard needs both writing_agents (type: 'writing') and
 * research_agents (type: 'research') from separate database tables, merged
 * into one response array
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  API_KEY_ENCRYPTION_KEY: 'a'.repeat(64)
}));

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$lib/server/project-access', () => ({
  resolveProjectId: vi.fn(() => Promise.resolve('proj-1'))
}));

// --- Supabase mock builder ---

function createChainMock(terminalValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(terminalValue);
  chain.single = vi.fn().mockResolvedValue(terminalValue);
  return chain;
}

let writingChain: ReturnType<typeof createChainMock>;
let researchChain: ReturnType<typeof createChainMock>;
let mockAuthUser: { id: string } | null = { id: 'user-1' };

const mockSupabase = {
  auth: {
    getUser: vi.fn(() =>
      Promise.resolve({
        data: { user: mockAuthUser },
        error: mockAuthUser ? null : { message: 'Not authenticated' }
      })
    )
  },
  from: vi.fn((table: string) => {
    if (table === 'writing_agents') return writingChain;
    if (table === 'research_agents') return researchChain;
    return createChainMock({ data: null, error: null });
  })
};

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase)
}));

// --- Helpers ---

function makeGetRequest(params?: Record<string, string>): Request {
  const url = new URL('http://localhost/api/v1/writing-agents');
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new Request(url.toString(), { method: 'GET' });
}

// --- Tests ---

describe('GET /api/v1/writing-agents - type tagging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockAuthUser = { id: 'user-1' };
  });

  it('should return writing agents with type "writing"', async () => {
    writingChain = createChainMock({
      data: [
        { id: 'w1', project_id: 'proj-1', name: 'Writer A', description: null, model: 'openai/gpt-4o', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
        { id: 'w2', project_id: 'proj-1', name: 'Writer B', description: null, model: 'openai/gpt-4o', is_active: true, created_at: '2024-01-02', updated_at: '2024-01-02' }
      ],
      error: null
    });
    researchChain = createChainMock({ data: [], error: null });

    const { GET } = await import('./+server.js');
    const request = makeGetRequest({ project_id: 'proj-1' });
    const url = new URL(request.url);
    const response = await GET({ request, url, cookies: {} } as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].type).toBe('writing');
    expect(body.data[1].type).toBe('writing');
  });

  it('should include research agents with type "research"', async () => {
    writingChain = createChainMock({
      data: [
        { id: 'w1', project_id: 'proj-1', name: 'Writer A', description: null, model: 'openai/gpt-4o', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' }
      ],
      error: null
    });
    researchChain = createChainMock({
      data: [
        { id: 'r1', project_id: 'proj-1', name: 'Researcher A', description: null, model: 'openai/gpt-4o', is_active: true, created_at: '2024-01-03', updated_at: '2024-01-03' }
      ],
      error: null
    });

    const { GET } = await import('./+server.js');
    const request = makeGetRequest({ project_id: 'proj-1' });
    const url = new URL(request.url);
    const response = await GET({ request, url, cookies: {} } as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);

    const writing = body.data.find((a: Record<string, unknown>) => a.id === 'w1');
    const research = body.data.find((a: Record<string, unknown>) => a.id === 'r1');
    expect(writing.type).toBe('writing');
    expect(research.type).toBe('research');
  });

  it('should return empty array when no agents exist', async () => {
    writingChain = createChainMock({ data: [], error: null });
    researchChain = createChainMock({ data: [], error: null });

    const { GET } = await import('./+server.js');
    const request = makeGetRequest({ project_id: 'proj-1' });
    const url = new URL(request.url);
    const response = await GET({ request, url, cookies: {} } as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
  });
});
