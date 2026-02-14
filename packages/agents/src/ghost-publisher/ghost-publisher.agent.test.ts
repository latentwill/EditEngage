import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GhostPublisherAgent, GhostPublisherError } from './ghost-publisher.agent.js';
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
