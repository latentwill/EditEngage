/**
 * @behavior API key endpoints allow users to manage AI provider API keys
 * with server-side encryption and masking for secure display
 * @business_rule Each project has at most one key per provider (upsert on POST).
 * Keys are encrypted at rest and masked before returning to the client (e.g., sk-or-****1234).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment variables
vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  API_KEY_ENCRYPTION_KEY: 'a'.repeat(64)
}));

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

// Mock crypto — pass-through for unit tests (integration tests validate real encryption)
vi.mock('$lib/server/crypto', () => ({
  encryptApiKey: vi.fn((key: string) => `encrypted:${key}`),
  decryptApiKey: vi.fn((key: string) => key.startsWith('encrypted:') ? key.slice(10) : key)
}));

// --- Supabase mock builder ---

function createChainMock(terminalValue: { data: unknown; error: unknown }) {
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

// Valid UUID for tests
const PROJ_UUID = '00000000-0000-0000-0000-000000000001';
const KEY_UUID = '00000000-0000-0000-0000-000000000010';

// --- Helpers ---

function makeRequest(method: string, body?: Record<string, unknown>, searchParams?: Record<string, string>): Request {
  const url = new URL('http://localhost/api/v1/api-keys');
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new Request(url.toString(), init);
}

function makeIdRequest(method: string, body?: Record<string, unknown>): Request {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new Request(`http://localhost/api/v1/api-keys/${KEY_UUID}`, init);
}

// --- Tests ---

describe('GET /api/v1/api-keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockChain = createChainMock({
      data: [
        { id: 'key-1', project_id: PROJ_UUID, provider: 'openrouter', api_key: 'encrypted:sk-or-v1-abc123def456', is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
        { id: 'key-2', project_id: PROJ_UUID, provider: 'perplexity', api_key: 'encrypted:pplx-abcdefghijklmnop', is_active: true, created_at: '2024-01-02T00:00:00Z', updated_at: '2024-01-02T00:00:00Z' }
      ],
      error: null
    });
  });

  it('returns api keys with masked values', async () => {
    const { GET } = await import('./+server.js');

    const request = makeRequest('GET', undefined, { project_id: PROJ_UUID });
    const url = new URL(request.url);
    const response = await GET({ request, url, cookies: {} } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(2);
    // Keys must be decrypted then masked
    expect(json.data[0].api_key).toBe('sk-o****f456');
    expect(json.data[1].api_key).toBe('pplx****mnop');
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthUser = null;

    const { GET } = await import('./+server.js');

    const request = makeRequest('GET', undefined, { project_id: PROJ_UUID });
    const url = new URL(request.url);
    const response = await GET({ request, url, cookies: {} } as never);

    expect(response.status).toBe(401);
  });

  it('returns 400 when project_id is missing', async () => {
    const { GET } = await import('./+server.js');

    const request = makeRequest('GET');
    const url = new URL(request.url);
    const response = await GET({ request, url, cookies: {} } as never);

    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid project_id format', async () => {
    const { GET } = await import('./+server.js');

    const request = makeRequest('GET', undefined, { project_id: 'not-a-uuid' });
    const url = new URL(request.url);
    const response = await GET({ request, url, cookies: {} } as never);

    expect(response.status).toBe(400);
  });
});

describe('POST /api/v1/api-keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockChain = createChainMock({
      data: { id: 'key-new', project_id: PROJ_UUID, provider: 'openai', api_key: 'encrypted:sk-abc123', is_active: true },
      error: null
    });
  });

  it('creates a new api key via upsert with encryption', async () => {
    const { POST } = await import('./+server.js');

    const request = makeRequest('POST', {
      project_id: PROJ_UUID,
      provider: 'openai',
      api_key: 'sk-abc123'
    });

    const response = await POST({ request, cookies: {} } as never);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.provider).toBe('openai');
    expect(mockSupabase.from).toHaveBeenCalledWith('api_keys');
    expect(mockChain.upsert).toHaveBeenCalled();
    // Verify encryption was applied to stored value
    const upsertCall = mockChain.upsert.mock.calls[0][0];
    expect(upsertCall.api_key).toBe('encrypted:sk-abc123');
  });

  it('returns 400 when provider is missing', async () => {
    const { POST } = await import('./+server.js');

    const request = makeRequest('POST', {
      project_id: PROJ_UUID,
      api_key: 'sk-abc123'
    });

    const response = await POST({ request, cookies: {} } as never);

    expect(response.status).toBe(400);
  });

  it('returns 400 when api_key is missing', async () => {
    const { POST } = await import('./+server.js');

    const request = makeRequest('POST', {
      project_id: PROJ_UUID,
      provider: 'openai'
    });

    const response = await POST({ request, cookies: {} } as never);

    expect(response.status).toBe(400);
  });

  it('returns 400 when project_id is missing', async () => {
    const { POST } = await import('./+server.js');

    const request = makeRequest('POST', {
      provider: 'openai',
      api_key: 'sk-abc123'
    });

    const response = await POST({ request, cookies: {} } as never);

    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid provider value', async () => {
    const { POST } = await import('./+server.js');

    const request = makeRequest('POST', {
      project_id: PROJ_UUID,
      provider: 'invalid-provider',
      api_key: 'sk-abc123'
    });

    const response = await POST({ request, cookies: {} } as never);

    expect(response.status).toBe(400);
  });

  it('masks the api_key in the response', async () => {
    const { POST } = await import('./+server.js');

    const request = makeRequest('POST', {
      project_id: PROJ_UUID,
      provider: 'openai',
      api_key: 'sk-abc123'
    });

    const response = await POST({ request, cookies: {} } as never);
    const json = await response.json();

    // Response should NOT contain the raw key
    expect(json.data.api_key).not.toBe('sk-abc123');
  });

  it('returns 400 for invalid project_id format', async () => {
    const { POST } = await import('./+server.js');

    const request = makeRequest('POST', {
      project_id: 'bad-format',
      provider: 'openai',
      api_key: 'sk-abc123'
    });

    const response = await POST({ request, cookies: {} } as never);

    expect(response.status).toBe(400);
  });
});

describe('PATCH /api/v1/api-keys/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockChain = createChainMock({
      data: { id: KEY_UUID, project_id: PROJ_UUID, provider: 'openai', api_key: 'encrypted:sk-updated', is_active: true },
      error: null
    });
  });

  it('updates an existing api key with encryption', async () => {
    const { PATCH } = await import('./[id]/+server.js');

    const request = makeIdRequest('PATCH', { api_key: 'sk-updated' });
    const response = await PATCH({ request, params: { id: KEY_UUID }, cookies: {} } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    // Response should be decrypted then masked
    expect(json.data.api_key).not.toBe('sk-updated');
    expect(mockChain.update).toHaveBeenCalled();
    expect(mockChain.eq).toHaveBeenCalledWith('id', KEY_UUID);
    // Verify encryption was applied to stored value
    const updateCall = mockChain.update.mock.calls[0][0];
    expect(updateCall.api_key).toBe('encrypted:sk-updated');
  });

  it('returns 400 when no update fields provided', async () => {
    const { PATCH } = await import('./[id]/+server.js');

    const request = makeIdRequest('PATCH', {});
    const response = await PATCH({ request, params: { id: KEY_UUID }, cookies: {} } as never);

    expect(response.status).toBe(400);
  });

  it('returns 400 for non-string api_key', async () => {
    const { PATCH } = await import('./[id]/+server.js');

    const request = makeIdRequest('PATCH', { api_key: 12345 });
    const response = await PATCH({ request, params: { id: KEY_UUID }, cookies: {} } as never);

    expect(response.status).toBe(400);
  });

  it('returns 400 for non-boolean is_active', async () => {
    const { PATCH } = await import('./[id]/+server.js');

    const request = makeIdRequest('PATCH', { is_active: 'yes' });
    const response = await PATCH({ request, params: { id: KEY_UUID }, cookies: {} } as never);

    expect(response.status).toBe(400);
  });
});

describe('DELETE /api/v1/api-keys/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockChain = createChainMock({
      data: null,
      error: null
    });
  });

  it('removes an api key', async () => {
    const { DELETE } = await import('./[id]/+server.js');

    const request = makeIdRequest('DELETE');
    const response = await DELETE({ request, params: { id: KEY_UUID }, cookies: {} } as never);

    expect(response.status).toBe(204);
    expect(mockChain.delete).toHaveBeenCalled();
    expect(mockChain.eq).toHaveBeenCalledWith('id', KEY_UUID);
  });

  it('returns 401 when not authenticated', async () => {
    mockAuthUser = null;

    const { DELETE } = await import('./[id]/+server.js');

    const request = makeIdRequest('DELETE');
    const response = await DELETE({ request, params: { id: KEY_UUID }, cookies: {} } as never);

    expect(response.status).toBe(401);
  });
});
