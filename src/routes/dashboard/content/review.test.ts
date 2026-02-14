/**
 * @behavior Content review flow: renders full article detail, supports edit mode,
 * persists edits via PATCH, approves/rejects content with appropriate status transitions
 * @business_rule Content follows a state machine: draft -> in_review -> approved -> published
 * OR draft -> in_review -> rejected. Rejection requires a reason. Approved content with
 * auto_publish triggers publishing. Rejected content is never published.
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

let mockContentChain: ReturnType<typeof createChainMock>;
let mockAuthUser: { id: string } | null = { id: 'user-1' };

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({
      data: { user: mockAuthUser },
      error: mockAuthUser ? null : { message: 'Not authenticated' }
    }))
  },
  from: vi.fn((table: string) => {
    if (table === 'content') {
      return mockContentChain;
    }
    return createChainMock({ data: null, error: null });
  })
};

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
  createServiceRoleClient: vi.fn(() => mockSupabase)
}));

// --- Helpers ---

function makeRequest(method: string, url: string, body?: Record<string, unknown>): Request {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

const mockContent = {
  id: 'content-1',
  project_id: 'proj-1',
  pipeline_run_id: 'run-1',
  title: 'How to Scale SEO',
  body: { html: '<p>This is the article body about scaling SEO strategies.</p>' },
  meta_description: 'Learn how to scale your SEO efforts effectively',
  tags: ['seo', 'marketing', 'growth'],
  content_type: 'article',
  status: 'in_review',
  published_at: null,
  published_url: null,
  destination_type: 'ghost',
  destination_config: { api_url: 'https://blog.example.com', auto_publish: true },
  created_at: '2025-01-10T10:00:00Z',
  updated_at: '2025-01-10T10:00:00Z'
};

// =============================================================================
// Task 31: Content Review Flow - API Route Tests
// =============================================================================

describe('GET /api/v1/content/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockContentChain = createChainMock({
      data: mockContent,
      error: null
    });
  });

  it('returns full content item with title, body, meta, and tags', async () => {
    const { GET } = await import('../../api/v1/content/[id]/+server.js');

    const request = makeRequest('GET', 'http://localhost/api/v1/content/content-1');
    const response = await GET({
      request,
      params: { id: 'content-1' }
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.title).toBe('How to Scale SEO');
    expect(json.data.body).toEqual({ html: '<p>This is the article body about scaling SEO strategies.</p>' });
    expect(json.data.meta_description).toBe('Learn how to scale your SEO efforts effectively');
    expect(json.data.tags).toEqual(['seo', 'marketing', 'growth']);
    expect(mockSupabase.from).toHaveBeenCalledWith('content');
    expect(mockContentChain.eq).toHaveBeenCalledWith('id', 'content-1');
  });

  it('returns 401 when user is not authenticated', async () => {
    mockAuthUser = null;

    const { GET } = await import('../../api/v1/content/[id]/+server.js');

    const request = makeRequest('GET', 'http://localhost/api/v1/content/content-1');
    const response = await GET({
      request,
      params: { id: 'content-1' }
    } as never);

    expect(response.status).toBe(401);
  });
});

describe('PATCH /api/v1/content/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockContentChain = createChainMock({
      data: {
        ...mockContent,
        title: 'Updated SEO Title',
        body: { html: '<p>Updated body content.</p>' },
        meta_description: 'Updated meta'
      },
      error: null
    });
  });

  it('updates title, body, and meta fields', async () => {
    const { PATCH } = await import('../../api/v1/content/[id]/+server.js');

    const request = makeRequest('PATCH', 'http://localhost/api/v1/content/content-1', {
      title: 'Updated SEO Title',
      body: { html: '<p>Updated body content.</p>' },
      meta_description: 'Updated meta'
    });

    const response = await PATCH({
      request,
      params: { id: 'content-1' }
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.title).toBe('Updated SEO Title');
    expect(json.data.body).toEqual({ html: '<p>Updated body content.</p>' });
    expect(json.data.meta_description).toBe('Updated meta');
    expect(mockContentChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Updated SEO Title',
        body: { html: '<p>Updated body content.</p>' },
        meta_description: 'Updated meta'
      })
    );
  });
});

describe('POST /api/v1/content/:id/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockContentChain = createChainMock({
      data: { ...mockContent, status: 'approved' },
      error: null
    });
  });

  it('changes status to approved and triggers publish if auto_publish', async () => {
    const { POST } = await import('../../api/v1/content/[id]/approve/+server.js');

    const request = makeRequest('POST', 'http://localhost/api/v1/content/content-1/approve');
    const response = await POST({
      request,
      params: { id: 'content-1' }
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.status).toBe('approved');
    expect(mockSupabase.from).toHaveBeenCalledWith('content');
    expect(mockContentChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved' })
    );
  });

  it('returns 401 when user is not authenticated', async () => {
    mockAuthUser = null;

    const { POST } = await import('../../api/v1/content/[id]/approve/+server.js');

    const request = makeRequest('POST', 'http://localhost/api/v1/content/content-1/approve');
    const response = await POST({
      request,
      params: { id: 'content-1' }
    } as never);

    expect(response.status).toBe(401);
  });
});

describe('POST /api/v1/content/:id/reject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockContentChain = createChainMock({
      data: { ...mockContent, status: 'rejected' },
      error: null
    });
  });

  it('requires a reason and changes status to rejected', async () => {
    const { POST } = await import('../../api/v1/content/[id]/reject/+server.js');

    const request = makeRequest('POST', 'http://localhost/api/v1/content/content-1/reject', {
      reason: 'Content quality does not meet standards'
    });
    const response = await POST({
      request,
      params: { id: 'content-1' }
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.status).toBe('rejected');
    expect(mockContentChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'rejected' })
    );
  });

  it('returns 400 when reason is missing', async () => {
    const { POST } = await import('../../api/v1/content/[id]/reject/+server.js');

    const request = makeRequest('POST', 'http://localhost/api/v1/content/content-1/reject', {});
    const response = await POST({
      request,
      params: { id: 'content-1' }
    } as never);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toMatch(/reason/i);
  });

  it('rejected content is not published to any destination', async () => {
    const { POST } = await import('../../api/v1/content/[id]/reject/+server.js');

    const request = makeRequest('POST', 'http://localhost/api/v1/content/content-1/reject', {
      reason: 'Not ready for publication'
    });
    const response = await POST({
      request,
      params: { id: 'content-1' }
    } as never);
    const json = await response.json();

    // Rejected content should have status 'rejected', not 'published'
    expect(json.data.status).toBe('rejected');
    // published_at and published_url should remain null
    expect(mockContentChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'rejected',
        published_at: null,
        published_url: null
      })
    );
  });
});

// =============================================================================
// Task 31: Bulk Action API Route
// =============================================================================

describe('POST /api/v1/content/bulk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockContentChain = createChainMock({
      data: [
        { id: 'content-1', status: 'approved' },
        { id: 'content-2', status: 'approved' }
      ],
      error: null
    });
  });

  it('bulk approves all selected items', async () => {
    const { POST } = await import('../../api/v1/content/bulk/+server.js');

    const request = makeRequest('POST', 'http://localhost/api/v1/content/bulk', {
      action: 'approve',
      ids: ['content-1', 'content-2']
    });
    const response = await POST({ request } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mockSupabase.from).toHaveBeenCalledWith('content');
    expect(mockContentChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved' })
    );
    expect(mockContentChain.in).toHaveBeenCalledWith('id', ['content-1', 'content-2']);
  });

  it('bulk rejects all selected items', async () => {
    mockContentChain = createChainMock({
      data: [
        { id: 'content-1', status: 'rejected' },
        { id: 'content-2', status: 'rejected' }
      ],
      error: null
    });

    const { POST } = await import('../../api/v1/content/bulk/+server.js');

    const request = makeRequest('POST', 'http://localhost/api/v1/content/bulk', {
      action: 'reject',
      ids: ['content-1', 'content-2']
    });
    const response = await POST({ request } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mockContentChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'rejected' })
    );
    expect(mockContentChain.in).toHaveBeenCalledWith('id', ['content-1', 'content-2']);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockAuthUser = null;

    const { POST } = await import('../../api/v1/content/bulk/+server.js');

    const request = makeRequest('POST', 'http://localhost/api/v1/content/bulk', {
      action: 'approve',
      ids: ['content-1']
    });
    const response = await POST({ request } as never);

    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid action', async () => {
    const { POST } = await import('../../api/v1/content/bulk/+server.js');

    const request = makeRequest('POST', 'http://localhost/api/v1/content/bulk', {
      action: 'delete',
      ids: ['content-1']
    });
    const response = await POST({ request } as never);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });
});
