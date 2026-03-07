/**
 * @behavior POST /api/v1/research creates a new research query scoped to user's project
 * @business_rule Users can only create research queries for projects they have access to
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(terminalValue));
  return chain;
}

let mockInsertChain: ReturnType<typeof createChainMock>;
let mockAuthUser: { id: string } | null = { id: 'user-1' };
let mockResolvedProjectId: string | null = 'proj-1';

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({
      data: { user: mockAuthUser },
      error: mockAuthUser ? null : { message: 'Not authenticated' }
    }))
  },
  from: vi.fn(() => mockInsertChain)
};

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
  createServiceRoleClient: vi.fn(() => mockSupabase)
}));

vi.mock('$lib/server/project-access.js', () => ({
  resolveProjectId: vi.fn(() => Promise.resolve(mockResolvedProjectId))
}));

// --- Helpers ---

function makePostRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/v1/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

describe('POST /api/v1/research', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockResolvedProjectId = 'proj-1';
    mockInsertChain = createChainMock({
      data: {
        id: 'rq-new',
        project_id: 'proj-1',
        name: 'SEO Research',
        status: 'queued'
      },
      error: null
    });
  });

  it('creates a research query and returns 201 with data', async () => {
    const { POST } = await import('./+server.js');

    const request = makePostRequest({ name: 'SEO Research', project_id: 'proj-1' });
    const response = await POST({ request, cookies: {} } as never);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.id).toBe('rq-new');
    expect(json.data.name).toBe('SEO Research');
    expect(json.data.status).toBe('queued');
    expect(mockSupabase.from).toHaveBeenCalledWith('research_queries');
    expect(mockInsertChain.insert).toHaveBeenCalledWith({
      project_id: 'proj-1',
      name: 'SEO Research',
      status: 'queued'
    });
  });

  it('returns 400 when name is missing', async () => {
    const { POST } = await import('./+server.js');

    const request = makePostRequest({ project_id: 'proj-1' });
    const response = await POST({ request, cookies: {} } as never);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('name is required');
  });

  it('returns 400 when name is empty string', async () => {
    const { POST } = await import('./+server.js');

    const request = makePostRequest({ name: '', project_id: 'proj-1' });
    const response = await POST({ request, cookies: {} } as never);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('name is required');
  });

  it('returns 400 when project_id cannot be resolved', async () => {
    mockResolvedProjectId = null;

    const { POST } = await import('./+server.js');

    const request = makePostRequest({ name: 'SEO Research' });
    const response = await POST({ request, cookies: {} } as never);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('project_id is required');
  });

  it('returns 401 when user is not authenticated', async () => {
    mockAuthUser = null;

    const { POST } = await import('./+server.js');

    const request = makePostRequest({ name: 'SEO Research', project_id: 'proj-1' });
    const response = await POST({ request, cookies: {} } as never);

    expect(response.status).toBe(401);
  });

  it('returns 500 when database insert fails', async () => {
    mockInsertChain = createChainMock({
      data: null,
      error: { message: 'DB insert failed' }
    });

    const { POST } = await import('./+server.js');

    const request = makePostRequest({ name: 'SEO Research', project_id: 'proj-1' });
    const response = await POST({ request, cookies: {} } as never);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe('Internal server error');
  });
});
