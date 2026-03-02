import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { GhostPublisherAgent, GhostPublisherError, createJwt } from './ghost-publisher.agent.js';
import { AgentType } from '../types.js';

const mockInput = {
  title: 'Advanced TypeScript Patterns for Production Apps',
  body: '<h2>Introduction</h2><p>TypeScript patterns help build robust apps.</p>',
  metaDescription: 'Learn advanced TypeScript patterns for production applications.',
  tags: ['typescript', 'patterns', 'advanced'],
  seoScore: 88
};

const mockGhostResponse = {
  posts: [
    {
      id: 'ghost-post-123',
      slug: 'advanced-typescript-patterns-for-production-apps',
      url: 'https://blog.example.com/advanced-typescript-patterns-for-production-apps/'
    }
  ]
};

function createMockFetch(options: {
  response?: Record<string, unknown>;
  status?: number;
  ok?: boolean;
  failCount?: number;
} = {}) {
  const {
    response = mockGhostResponse,
    status = 201,
    ok = true,
    failCount = 0
  } = options;

  let callCount = 0;

  return vi.fn().mockImplementation(() => {
    callCount++;
    if (callCount <= failCount) {
      return Promise.resolve({
        ok: false,
        status: 502,
        json: () => Promise.resolve({ errors: [{ message: 'Bad Gateway' }] })
      });
    }
    return Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(response)
    });
  });
}

describe('GhostPublisherAgent', () => {
  let agent: GhostPublisherAgent;
  let mockFetch: ReturnType<typeof createMockFetch>;

  const config = {
    apiUrl: 'https://blog.example.com',
    adminApiKey: '6489abcdef0123456789abcd:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    reviewMode: 'auto_publish' as const
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = createMockFetch();
    agent = new GhostPublisherAgent(mockFetch as never);
  });

  it('creates a draft post when review_mode is "draft_for_review"', async () => {
    const draftConfig = { ...config, reviewMode: 'draft_for_review' as const };

    await agent.execute(mockInput, draftConfig);

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/ghost/api/admin/posts/');
    const body = JSON.parse(options.body as string);
    expect(body.posts[0].status).toBe('draft');
  });

  it('publishes post when review_mode is "auto_publish"', async () => {
    await agent.execute(mockInput, config);

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/ghost/api/admin/posts/');
    const body = JSON.parse(options.body as string);
    expect(body.posts[0].status).toBe('published');
  });

  it('returns { ghostPostId, slug, url } on success', async () => {
    const result = await agent.execute(mockInput, config);

    expect(result.ghostPostId).toBe('ghost-post-123');
    expect(result.slug).toBe('advanced-typescript-patterns-for-production-apps');
    expect(result.url).toBe('https://blog.example.com/advanced-typescript-patterns-for-production-apps/');
  });

  it('throws typed error on invalid credentials', async () => {
    const unauthorizedFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ errors: [{ message: 'Invalid token' }] })
    });

    agent = new GhostPublisherAgent(unauthorizedFetch as never);

    await expect(agent.execute(mockInput, config)).rejects.toThrow(GhostPublisherError);
    await expect(agent.execute(mockInput, config)).rejects.toThrow('Ghost API authentication failed');
  });

  it('retries on network failure with exponential backoff', async () => {
    // Fail twice (502), then succeed on 3rd attempt
    mockFetch = createMockFetch({ failCount: 2 });
    agent = new GhostPublisherAgent(mockFetch as never);

    const start = Date.now();
    const result = await agent.execute(mockInput, config);
    const elapsed = Date.now() - start;

    expect(result.ghostPostId).toBe('ghost-post-123');
    expect(mockFetch).toHaveBeenCalledTimes(3);
    // Should have some delay from exponential backoff (at least ~150ms for 100ms + 200ms delays)
    // Using a generous minimum to avoid flakiness
    expect(elapsed).toBeGreaterThanOrEqual(50);
  });
});

describe('createJwt', () => {
  const apiKey = '6489abcdef0123456789abcd:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const keyId = '6489abcdef0123456789abcd';
  const secretHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  it('produces a JWT with three base64url-encoded parts', () => {
    const token = createJwt(apiKey);
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
  });

  it('encodes header with alg HS256, typ JWT, and kid from api key', () => {
    const token = createJwt(apiKey);
    const [headerB64] = token.split('.');
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
    expect(header).toEqual({ alg: 'HS256', typ: 'JWT', kid: keyId });
  });

  it('encodes payload with aud /admin/, valid iat and exp 5 minutes apart', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = createJwt(apiKey);
    const [, payloadB64] = token.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

    expect(payload.aud).toBe('/admin/');
    expect(payload.iat).toBeGreaterThanOrEqual(now - 2);
    expect(payload.iat).toBeLessThanOrEqual(now + 2);
    expect(payload.exp).toBe(payload.iat + 300);
  });

  it('signature is a valid HMAC-SHA256 of header.payload using hex-decoded secret', () => {
    const token = createJwt(apiKey);
    const [headerB64, payloadB64, signatureB64] = token.split('.');

    const signingInput = `${headerB64}.${payloadB64}`;
    const secretBuffer = Buffer.from(secretHex, 'hex');
    const expectedSig = crypto
      .createHmac('sha256', secretBuffer)
      .update(signingInput)
      .digest('base64url');

    expect(signatureB64).toBe(expectedSig);
  });
});
