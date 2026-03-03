/**
 * @behavior PATCH /api/v1/writing-agents/:id updates editable fields on a writing agent
 * @business_rule Only authenticated users can update their writing agents (enforced by RLS).
 * Any combination of name, description, model, system_prompt, is_active may be patched;
 * if no valid fields are provided, return 400.
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

let mockAgentsChain: ReturnType<typeof createChainMock>;
let mockAuthUser: { id: string } | null = { id: 'user-1' };

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({
      data: { user: mockAuthUser },
      error: mockAuthUser ? null : { message: 'Not authenticated' }
    }))
  },
  from: vi.fn(() => mockAgentsChain)
};

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
  createServiceRoleClient: vi.fn(() => mockSupabase)
}));

// --- Helpers ---

const baseAgent = {
  id: 'agent-1',
  project_id: 'proj-1',
  name: 'Original Agent',
  description: 'Original description',
  model: 'gpt-4o',
  system_prompt: 'You are a helpful writer.',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
};

function makePatchRequest(id: string, body: Record<string, unknown>): Request {
  return new Request(`http://localhost/api/v1/writing-agents/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

describe('PATCH /api/v1/writing-agents/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
  });

  it('updates name field and returns updated agent', async () => {
    const selectChain = createChainMock({
      data: { ...baseAgent },
      error: null
    });
    const updateChain = createChainMock({
      data: { ...baseAgent, name: 'Updated Name', updated_at: '2026-01-02T00:00:00Z' },
      error: null
    });

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return selectChain;
      return updateChain;
    });

    const { PATCH } = await import('./+server.js');

    const request = makePatchRequest('agent-1', { name: 'Updated Name' });
    const response = await PATCH({
      request,
      params: { id: 'agent-1' },
      cookies: {}
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.name).toBe('Updated Name');
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Updated Name' })
    );
  });

  it('updates multiple fields at once', async () => {
    const selectChain = createChainMock({
      data: { ...baseAgent },
      error: null
    });
    const updateChain = createChainMock({
      data: {
        ...baseAgent,
        name: 'New Name',
        description: 'New desc',
        model: 'claude-3-opus',
        system_prompt: 'New prompt',
        is_active: false
      },
      error: null
    });

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return selectChain;
      return updateChain;
    });

    const { PATCH } = await import('./+server.js');

    const request = makePatchRequest('agent-1', {
      name: 'New Name',
      description: 'New desc',
      model: 'claude-3-opus',
      system_prompt: 'New prompt',
      is_active: false
    });
    const response = await PATCH({
      request,
      params: { id: 'agent-1' },
      cookies: {}
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.name).toBe('New Name');
    expect(json.data.description).toBe('New desc');
    expect(json.data.model).toBe('claude-3-opus');
    expect(json.data.system_prompt).toBe('New prompt');
    expect(json.data.is_active).toBe(false);
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Name',
        description: 'New desc',
        model: 'claude-3-opus',
        system_prompt: 'New prompt',
        is_active: false
      })
    );
  });

  it('still supports is_active toggle alone', async () => {
    const selectChain = createChainMock({
      data: { ...baseAgent },
      error: null
    });
    const updateChain = createChainMock({
      data: { ...baseAgent, is_active: false },
      error: null
    });

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return selectChain;
      return updateChain;
    });

    const { PATCH } = await import('./+server.js');

    const request = makePatchRequest('agent-1', { is_active: false });
    const response = await PATCH({
      request,
      params: { id: 'agent-1' },
      cookies: {}
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.is_active).toBe(false);
  });

  it('returns 400 when no valid fields are provided', async () => {
    const { PATCH } = await import('./+server.js');

    const request = makePatchRequest('agent-1', { bogus: 'value' });
    const response = await PATCH({
      request,
      params: { id: 'agent-1' },
      cookies: {}
    } as never);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('returns 400 when body is empty', async () => {
    const { PATCH } = await import('./+server.js');

    const request = makePatchRequest('agent-1', {});
    const response = await PATCH({
      request,
      params: { id: 'agent-1' },
      cookies: {}
    } as never);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockAuthUser = null;

    const { PATCH } = await import('./+server.js');

    const request = makePatchRequest('agent-1', { name: 'Updated' });
    const response = await PATCH({
      request,
      params: { id: 'agent-1' },
      cookies: {}
    } as never);

    expect(response.status).toBe(401);
  });

  it('returns 404 when agent is not found', async () => {
    const notFoundChain = createChainMock({
      data: null,
      error: null
    });
    mockSupabase.from.mockImplementation(() => notFoundChain);

    const { PATCH } = await import('./+server.js');

    const request = makePatchRequest('nonexistent', { name: 'Updated' });
    const response = await PATCH({
      request,
      params: { id: 'nonexistent' },
      cookies: {}
    } as never);

    expect(response.status).toBe(404);
  });

  it('ignores unknown fields and only updates valid ones', async () => {
    const selectChain = createChainMock({
      data: { ...baseAgent },
      error: null
    });
    const updateChain = createChainMock({
      data: { ...baseAgent, name: 'Valid Name' },
      error: null
    });

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return selectChain;
      return updateChain;
    });

    const { PATCH } = await import('./+server.js');

    const request = makePatchRequest('agent-1', {
      name: 'Valid Name',
      unknown_field: 'should be ignored'
    });
    const response = await PATCH({
      request,
      params: { id: 'agent-1' },
      cookies: {}
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.name).toBe('Valid Name');
    // Verify only valid fields were sent to update
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Valid Name' })
    );
    const updateArg = updateChain.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg).not.toHaveProperty('unknown_field');
  });
});
