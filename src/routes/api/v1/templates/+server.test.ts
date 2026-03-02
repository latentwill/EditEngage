/**
 * @behavior POST /api/v1/templates defaults JSONB fields to empty objects
 * when not provided, preventing NOT NULL constraint violations in the database.
 * @business_rule Templates must always have valid JSONB values for seo_config
 * and data_source_config — null is not acceptable for NOT NULL columns.
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

let mockChain: ReturnType<typeof createChainMock>;
let mockAuthUser: { id: string } | null = { id: 'user-1' };

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({
      data: { user: mockAuthUser },
      error: mockAuthUser ? null : { message: 'Not authenticated' }
    }))
  },
  from: vi.fn(() => mockChain)
};

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
  createServiceRoleClient: vi.fn(() => mockSupabase)
}));

// --- Helpers ---

function makeRequest(method: string, body?: Record<string, unknown>): Request {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new Request('http://localhost/api/v1/templates', init);
}

describe('POST /api/v1/templates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockChain = createChainMock({
      data: {
        id: 'tmpl-1',
        name: 'Test Template',
        slug_pattern: '/blog/{{slug}}',
        seo_config: {},
        data_source_config: {}
      },
      error: null
    });
  });

  it('defaults seo_config to empty object when not provided', async () => {
    const { POST } = await import('./+server.js');

    const request = makeRequest('POST', {
      name: 'Test Template',
      slug_pattern: '/blog/{{slug}}'
    });

    const response = await POST({
      request,
      cookies: {}
    } as never);

    expect(response.status).toBe(201);

    const insertCall = mockChain.insert.mock.calls[0][0];
    expect(insertCall.seo_config).toEqual({});
  });

  it('defaults data_source_config to empty object when not provided', async () => {
    const { POST } = await import('./+server.js');

    const request = makeRequest('POST', {
      name: 'Test Template',
      slug_pattern: '/blog/{{slug}}'
    });

    const response = await POST({
      request,
      cookies: {}
    } as never);

    expect(response.status).toBe(201);

    const insertCall = mockChain.insert.mock.calls[0][0];
    expect(insertCall.data_source_config).toEqual({});
  });

  it('preserves explicit seo_config when provided', async () => {
    const { POST } = await import('./+server.js');

    const seoConfig = { title_template: '{{name}} | Blog', meta_description: 'A blog post' };
    const request = makeRequest('POST', {
      name: 'Test Template',
      slug_pattern: '/blog/{{slug}}',
      seo_config: seoConfig
    });

    const response = await POST({
      request,
      cookies: {}
    } as never);

    expect(response.status).toBe(201);

    const insertCall = mockChain.insert.mock.calls[0][0];
    expect(insertCall.seo_config).toEqual(seoConfig);
  });
});
