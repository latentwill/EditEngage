import { describe, it, expect, vi } from 'vitest';
import { PostBridgePublisherAgent, PostBridgePublisherError } from './postbridge-publisher.agent.js';

/**
 * @behavior PostBridge Publisher calls Post Bridge API with formatted content
 * @business_rule Content must be sent to the Post Bridge API endpoint with correct authorization and payload structure
 */
describe('PostBridgePublisherAgent', () => {
  it('calls Post Bridge API with formatted content', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        results: [
          { platform: 'twitter', postId: 'tw-123' },
          { platform: 'linkedin', postId: 'li-456' }
        ]
      })
    });

    const agent = new PostBridgePublisherAgent(mockFetch);

    await agent.execute(
      {
        content: 'Check out our latest article on TypeScript patterns!',
        platforms: ['twitter', 'linkedin'],
        url: 'https://blog.example.com/typescript-patterns'
      },
      {
        apiUrl: 'https://postbridge.example.com',
        apiKey: 'pb-test-key-123'
      }
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://postbridge.example.com/api/v1/publish');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual(expect.objectContaining({
      'Authorization': 'Bearer pb-test-key-123',
      'Content-Type': 'application/json'
    }));
    const body = JSON.parse(options.body as string);
    expect(body.content).toContain('Check out our latest article on TypeScript patterns!');
    expect(body.content).toContain('https://blog.example.com/typescript-patterns');
    expect(body.platforms).toEqual(['twitter', 'linkedin']);
    expect(body.url).toBe('https://blog.example.com/typescript-patterns');
  });

  /**
   * @behavior PostBridge Publisher formats text for platform-specific limits
   * @business_rule Twitter content must be truncated to 280 chars; LinkedIn to 3000 chars; content includes the URL in the character count
   */
  it('formats text for platform-specific limits', async () => {
    const longContent = 'A'.repeat(300);
    const articleUrl = 'https://blog.example.com/article';
    // Twitter limit is 280, URL takes space: content should be truncated so content + " " + url + "..." fits in 280
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        results: [{ platform: 'twitter', postId: 'tw-789' }]
      })
    });

    const agent = new PostBridgePublisherAgent(mockFetch);

    await agent.execute(
      {
        content: longContent,
        platforms: ['twitter'],
        url: articleUrl
      },
      {
        apiUrl: 'https://postbridge.example.com',
        apiKey: 'pb-test-key-123'
      }
    );

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    // The formatted content sent to the API must not exceed 280 chars
    expect(body.content.length).toBeLessThanOrEqual(280);
    // It should end with an ellipsis to indicate truncation, followed by the URL
    expect(body.content).toContain('...');
    expect(body.content).toContain(articleUrl);
  });

  it('does not truncate short content for twitter', async () => {
    const shortContent = 'Short tweet';
    const articleUrl = 'https://example.com';
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        results: [{ platform: 'twitter', postId: 'tw-short' }]
      })
    });

    const agent = new PostBridgePublisherAgent(mockFetch);

    await agent.execute(
      {
        content: shortContent,
        platforms: ['twitter'],
        url: articleUrl
      },
      {
        apiUrl: 'https://postbridge.example.com',
        apiKey: 'pb-test-key-123'
      }
    );

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    // Short content should include original content and URL without truncation
    expect(body.content).toContain(shortContent);
    expect(body.content).toContain(articleUrl);
    expect(body.content).not.toContain('...');
  });

  /**
   * @behavior PostBridge Publisher returns structured output on success
   * @business_rule A successful publish must return an array of platform/postId pairs so callers can track what was published
   */
  it('returns { posts: [{ platform, postId }] } on success', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        results: [
          { platform: 'twitter', postId: 'tw-success-1' },
          { platform: 'linkedin', postId: 'li-success-2' },
          { platform: 'facebook', postId: 'fb-success-3' }
        ]
      })
    });

    const agent = new PostBridgePublisherAgent(mockFetch);

    const result = await agent.execute(
      {
        content: 'New blog post about testing',
        platforms: ['twitter', 'linkedin', 'facebook'],
        url: 'https://blog.example.com/testing'
      },
      {
        apiUrl: 'https://postbridge.example.com',
        apiKey: 'pb-key'
      }
    );

    expect(result).toEqual({
      posts: [
        { platform: 'twitter', postId: 'tw-success-1' },
        { platform: 'linkedin', postId: 'li-success-2' },
        { platform: 'facebook', postId: 'fb-success-3' }
      ]
    });
    expect(result.posts).toHaveLength(3);
    expect(result.posts[0].platform).toBe('twitter');
    expect(result.posts[0].postId).toBe('tw-success-1');
  });

  /**
   * @behavior PostBridge Publisher throws typed error on API failure
   * @business_rule API failures must surface as PostBridgePublisherError with the status code and error message for debugging
   */
  it('throws PostBridgePublisherError on API failure', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({
        error: 'Invalid platform specified: mastodon'
      })
    });

    const agent = new PostBridgePublisherAgent(mockFetch);

    await expect(
      agent.execute(
        {
          content: 'Test post',
          platforms: ['mastodon'],
          url: 'https://example.com'
        },
        {
          apiUrl: 'https://postbridge.example.com',
          apiKey: 'pb-key'
        }
      )
    ).rejects.toThrow(PostBridgePublisherError);

    await expect(
      agent.execute(
        {
          content: 'Test post',
          platforms: ['mastodon'],
          url: 'https://example.com'
        },
        {
          apiUrl: 'https://postbridge.example.com',
          apiKey: 'pb-key'
        }
      )
    ).rejects.toThrow('Post Bridge API error (422): Invalid platform specified: mastodon');
  });

  it('throws PostBridgePublisherError on server error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({
        error: 'Internal server error'
      })
    });

    const agent = new PostBridgePublisherAgent(mockFetch);

    await expect(
      agent.execute(
        {
          content: 'Test post',
          platforms: ['twitter'],
          url: 'https://example.com'
        },
        {
          apiUrl: 'https://postbridge.example.com',
          apiKey: 'pb-key'
        }
      )
    ).rejects.toThrow(PostBridgePublisherError);
  });
});
