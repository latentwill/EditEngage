/**
 * @behavior Notification subscription endpoints allow users to manage per-project
 * notification preferences by module and event type.
 * @business_rule Each user has at most one subscription per project (UNIQUE constraint).
 * Users can only see and modify their own subscriptions (RLS + user_id scoping).
 * Subscriptions control which modules generate notifications for the user.
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

type TerminalValue = { data: unknown; error: unknown; count?: number };

function createChainMock(terminalValue: TerminalValue) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.upsert = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(terminalValue);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.then = vi.fn((resolve: (v: TerminalValue) => void) => resolve(terminalValue));
  return chain;
}

let mockChain: ReturnType<typeof createChainMock>;
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
  from: vi.fn(() => mockChain)
};

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase)
}));

// Valid UUIDs for tests
const PROJ_UUID = '00000000-0000-0000-0000-000000000001';
const SUB_UUID = '00000000-0000-0000-0000-000000000020';

// --- Helpers ---

function makeRequest(
  method: string,
  body?: Record<string, unknown>
): Request {
  const url = 'http://localhost/api/v1/notifications/subscriptions';
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

// --- Tests ---

describe('GET /api/v1/notifications/subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockChain = createChainMock({
      data: [
        {
          id: SUB_UUID,
          user_id: 'user-1',
          project_id: PROJ_UUID,
          subscribed_modules: ['research', 'writing', 'publish', 'system'],
          subscribed_event_types: [],
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ],
      error: null
    });
  });

  it('returns subscriptions for the authenticated user', async () => {
    const { GET } = await import('./+server.js');

    const request = makeRequest('GET');
    const response = await GET({ request, cookies: {} } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.subscriptions).toHaveLength(1);
    expect(json.subscriptions[0].project_id).toBe(PROJ_UUID);
  });

  it('scopes query to the authenticated user_id', async () => {
    const { GET } = await import('./+server.js');

    const request = makeRequest('GET');
    await GET({ request, cookies: {} } as never);

    expect(mockSupabase.from).toHaveBeenCalledWith('notification_subscriptions');
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthUser = null;

    const { GET } = await import('./+server.js');

    const request = makeRequest('GET');
    const response = await GET({ request, cookies: {} } as never);

    expect(response.status).toBe(401);
  });
});

describe('POST /api/v1/notifications/subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockChain = createChainMock({
      data: {
        id: SUB_UUID,
        user_id: 'user-1',
        project_id: PROJ_UUID,
        subscribed_modules: ['research', 'system'],
        subscribed_event_types: [],
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      error: null
    });
  });

  it('creates a new subscription with user_id from auth', async () => {
    const { POST } = await import('./+server.js');

    const request = makeRequest('POST', {
      project_id: PROJ_UUID,
      subscribed_modules: ['research', 'system']
    });

    const response = await POST({ request, cookies: {} } as never);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.subscription.project_id).toBe(PROJ_UUID);
    expect(mockSupabase.from).toHaveBeenCalledWith('notification_subscriptions');
    expect(mockChain.insert).toHaveBeenCalled();
  });

  it('injects user_id from auth context, not from request body', async () => {
    const { POST } = await import('./+server.js');

    const request = makeRequest('POST', {
      project_id: PROJ_UUID,
      subscribed_modules: ['research'],
      user_id: 'attacker-id'
    });

    await POST({ request, cookies: {} } as never);

    const insertCall = mockChain.insert.mock.calls[0][0] as { user_id: string };
    expect(insertCall.user_id).toBe('user-1');
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthUser = null;

    const { POST } = await import('./+server.js');

    const request = makeRequest('POST', {
      project_id: PROJ_UUID,
      subscribed_modules: ['research']
    });

    const response = await POST({ request, cookies: {} } as never);

    expect(response.status).toBe(401);
  });

  it('returns 400 when project_id is missing', async () => {
    const { POST } = await import('./+server.js');

    const request = makeRequest('POST', {
      subscribed_modules: ['research']
    });

    const response = await POST({ request, cookies: {} } as never);

    expect(response.status).toBe(400);
  });

  it('returns 400 when project_id is not a valid UUID', async () => {
    const { POST } = await import('./+server.js');

    const request = makeRequest('POST', {
      project_id: 'not-a-uuid',
      subscribed_modules: ['research']
    });

    const response = await POST({ request, cookies: {} } as never);

    expect(response.status).toBe(400);
  });

  it('returns 400 when subscribed_modules is not an array', async () => {
    const { POST } = await import('./+server.js');

    const request = makeRequest('POST', {
      project_id: PROJ_UUID,
      subscribed_modules: 'research'
    });

    const response = await POST({ request, cookies: {} } as never);

    expect(response.status).toBe(400);
  });
});

describe('PATCH /api/v1/notifications/subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockChain = createChainMock({
      data: {
        id: SUB_UUID,
        user_id: 'user-1',
        project_id: PROJ_UUID,
        subscribed_modules: ['writing'],
        subscribed_event_types: [],
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      error: null
    });
  });

  it('updates subscription modules', async () => {
    const { PATCH } = await import('./+server.js');

    const request = makeRequest('PATCH', {
      id: SUB_UUID,
      subscribed_modules: ['writing']
    });

    const response = await PATCH({ request, cookies: {} } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.subscription).toBeDefined();
    expect(mockSupabase.from).toHaveBeenCalledWith('notification_subscriptions');
    expect(mockChain.update).toHaveBeenCalled();
    expect(mockChain.eq).toHaveBeenCalledWith('id', SUB_UUID);
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('allows updating is_active flag', async () => {
    const { PATCH } = await import('./+server.js');

    const request = makeRequest('PATCH', {
      id: SUB_UUID,
      is_active: false
    });

    const response = await PATCH({ request, cookies: {} } as never);

    expect(response.status).toBe(200);
    const updateCall = mockChain.update.mock.calls[0][0] as { is_active: boolean };
    expect(updateCall.is_active).toBe(false);
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthUser = null;

    const { PATCH } = await import('./+server.js');

    const request = makeRequest('PATCH', {
      id: SUB_UUID,
      subscribed_modules: ['writing']
    });

    const response = await PATCH({ request, cookies: {} } as never);

    expect(response.status).toBe(401);
  });

  it('returns 400 when id is missing', async () => {
    const { PATCH } = await import('./+server.js');

    const request = makeRequest('PATCH', {
      subscribed_modules: ['writing']
    });

    const response = await PATCH({ request, cookies: {} } as never);

    expect(response.status).toBe(400);
  });

  it('returns 400 when no update fields are provided', async () => {
    const { PATCH } = await import('./+server.js');

    const request = makeRequest('PATCH', {
      id: SUB_UUID
    });

    const response = await PATCH({ request, cookies: {} } as never);

    expect(response.status).toBe(400);
  });

  it('returns 400 when subscribed_modules is not an array', async () => {
    const { PATCH } = await import('./+server.js');

    const request = makeRequest('PATCH', {
      id: SUB_UUID,
      subscribed_modules: 'writing'
    });

    const response = await PATCH({ request, cookies: {} } as never);

    expect(response.status).toBe(400);
  });

  it('returns 400 when is_active is not a boolean', async () => {
    const { PATCH } = await import('./+server.js');

    const request = makeRequest('PATCH', {
      id: SUB_UUID,
      is_active: 'yes'
    });

    const response = await PATCH({ request, cookies: {} } as never);

    expect(response.status).toBe(400);
  });
});
