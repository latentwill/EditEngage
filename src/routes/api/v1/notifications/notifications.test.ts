/**
 * @behavior Notifications API returns paginated, filterable notifications
 * for the authenticated user, joined with event data.
 * @business_rule Notifications are scoped to the authenticated user via
 * user_id; only the owning user can read their notifications.
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

interface ChainMock {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  then: ReturnType<typeof vi.fn>;
}

function createChainMock(terminalValue: { data: unknown; error: unknown; count?: number }): ChainMock {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.range = vi.fn().mockReturnValue(chain);
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(terminalValue));
  return chain as unknown as ChainMock;
}

let mockNotificationsChain: ChainMock;
let mockAuthUser: { id: string } | null = { id: 'user-1' };

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({
      data: { user: mockAuthUser },
      error: mockAuthUser ? null : { message: 'Not authenticated' }
    }))
  },
  from: vi.fn((_table: string) => {
    return mockNotificationsChain;
  })
};

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
  createServiceRoleClient: vi.fn(() => mockSupabase)
}));

// --- Helpers ---

function makeUrl(params?: Record<string, string>): URL {
  const url = new URL('http://localhost/api/v1/notifications');
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return url;
}

function makeRequest(): Request {
  return new Request('http://localhost/api/v1/notifications', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
}

const sampleNotifications = [
  {
    id: 'notif-1',
    user_id: 'user-1',
    project_id: 'proj-1',
    event_id: 'evt-1',
    title: 'Article drafted',
    message: 'Your article "Intro to TDD" was drafted.',
    is_read: false,
    created_at: '2026-03-03T10:00:00Z',
    tier: 'alert',
    events: {
      event_type: 'article.drafted',
      module: 'content',
      agent_id: 'agent-writer',
      payload_summary: 'Draft complete',
      artifact_link: '/articles/123'
    }
  },
  {
    id: 'notif-2',
    user_id: 'user-1',
    project_id: 'proj-1',
    event_id: 'evt-2',
    title: 'Workflow completed',
    message: 'Workflow "Weekly Blog" finished.',
    is_read: true,
    created_at: '2026-03-03T09:00:00Z',
    tier: 'update',
    events: {
      event_type: 'workflow.completed',
      module: 'workflows',
      agent_id: 'agent-orchestrator',
      payload_summary: 'All steps passed',
      artifact_link: '/workflows/456'
    }
  }
];

describe('GET /api/v1/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockNotificationsChain = createChainMock({
      data: sampleNotifications,
      error: null,
      count: 2
    });
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthUser = null;

    const { GET } = await import('./+server.js');

    const response = await GET({
      url: makeUrl(),
      cookies: {}
    } as never);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('returns paginated notifications with default limit and offset', async () => {
    const { GET } = await import('./+server.js');

    const response = await GET({
      url: makeUrl(),
      cookies: {}
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.notifications).toHaveLength(2);
    expect(json.total).toBe(2);
    expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
    expect(mockNotificationsChain.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mockNotificationsChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(mockNotificationsChain.range).toHaveBeenCalledWith(0, 19);
  });

  it('respects limit and offset query params', async () => {
    const { GET } = await import('./+server.js');

    const response = await GET({
      url: makeUrl({ limit: '10', offset: '5' }),
      cookies: {}
    } as never);

    expect(response.status).toBe(200);
    // range is offset to offset+limit-1
    expect(mockNotificationsChain.range).toHaveBeenCalledWith(5, 14);
  });

  it('filters by tier when tier param provided', async () => {
    const { GET } = await import('./+server.js');

    const response = await GET({
      url: makeUrl({ tier: 'alert' }),
      cookies: {}
    } as never);

    expect(response.status).toBe(200);
    expect(mockNotificationsChain.eq).toHaveBeenCalledWith('tier', 'alert');
  });

  it('filters by is_read when is_read param provided', async () => {
    const { GET } = await import('./+server.js');

    const response = await GET({
      url: makeUrl({ is_read: 'false' }),
      cookies: {}
    } as never);

    expect(response.status).toBe(200);
    expect(mockNotificationsChain.eq).toHaveBeenCalledWith('is_read', false);
  });

  it('filters by project_id when project_id param provided', async () => {
    const { GET } = await import('./+server.js');

    const response = await GET({
      url: makeUrl({ project_id: 'proj-1' }),
      cookies: {}
    } as never);

    expect(response.status).toBe(200);
    expect(mockNotificationsChain.eq).toHaveBeenCalledWith('project_id', 'proj-1');
  });

  it('joins event data in response', async () => {
    const { GET } = await import('./+server.js');

    const response = await GET({
      url: makeUrl(),
      cookies: {}
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    // Verify select includes the event join columns
    expect(mockNotificationsChain.select).toHaveBeenCalledWith(
      '*, events(event_type, module, agent_id, payload_summary, artifact_link)',
      { count: 'exact' }
    );
    // Verify event data is present in response
    expect(json.notifications[0].events).toBeDefined();
    expect(json.notifications[0].events.event_type).toBe('article.drafted');
    expect(json.notifications[0].events.module).toBe('content');
    expect(json.notifications[0].events.agent_id).toBe('agent-writer');
    expect(json.notifications[0].events.payload_summary).toBe('Draft complete');
    expect(json.notifications[0].events.artifact_link).toBe('/articles/123');
  });

  it('returns total count in response', async () => {
    const { GET } = await import('./+server.js');

    const response = await GET({
      url: makeUrl(),
      cookies: {}
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.total).toBe(2);
  });
});
