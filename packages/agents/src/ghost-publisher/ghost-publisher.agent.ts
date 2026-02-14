import { AgentType, type Agent, type AgentConfig, type ValidationResult } from '../types.js';

export class GhostPublisherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GhostPublisherError';
  }
}

export interface GhostPublisherInput {
  title: string;
  body: string;
  metaDescription: string;
  tags: string[];
  seoScore: number;
}

export interface GhostPublisherOutput {
  ghostPostId: string;
  slug: string;
  url: string;
}

export interface GhostPublisherConfig extends AgentConfig {
  apiUrl: string;
  adminApiKey: string;
  reviewMode: 'auto_publish' | 'draft_for_review';
}

interface GhostPostResponse {
  posts: Array<{
    id: string;
    slug: string;
    url: string;
  }>;
}

interface GhostErrorResponse {
  errors: Array<{ message: string }>;
}

type FetchFn = (url: string, init?: RequestInit) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 100;

// TODO: Replace with proper HMAC-SHA256 JWT signing using 'jose' library before production use
function createJwt(apiKey: string): string {
  const [id, secret] = apiKey.split(':');

  // Create a simple JWT header and payload (mocked in tests, real impl would use crypto)
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: id }));
  const now = Math.floor(Date.now() / 1000);
  const payload = btoa(JSON.stringify({ iat: now, exp: now + 300, aud: '/admin/' }));

  // PLACEHOLDER: This is NOT a valid HMAC-SHA256 signature.
  // In production, use the 'jose' library to create a proper JWT with HMAC-SHA256 signing.
  const signature = btoa(secret.slice(0, 32));

  return `${header}.${payload}.${signature}`;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class GhostPublisherAgent implements Agent<GhostPublisherInput, GhostPublisherOutput> {
  type = AgentType.GHOST_PUBLISHER;

  private fetchFn: FetchFn;

  constructor(fetchFn: FetchFn) {
    this.fetchFn = fetchFn;
  }

  async execute(
    input: GhostPublisherInput,
    config?: GhostPublisherConfig
  ): Promise<GhostPublisherOutput> {
    const cfg = config ?? { apiUrl: '', adminApiKey: ':', reviewMode: 'draft_for_review' };

    const token = createJwt(cfg.adminApiKey);
    const status = cfg.reviewMode === 'auto_publish' ? 'published' : 'draft';

    const postBody = {
      posts: [
        {
          title: input.title,
          html: input.body,
          meta_description: input.metaDescription,
          tags: input.tags.map(t => ({ name: t })),
          status
        }
      ]
    };

    const url = `${cfg.apiUrl}/ghost/api/admin/posts/?source=html`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await delay(BASE_DELAY_MS * Math.pow(2, attempt - 1));
      }

      const response = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          'Authorization': `Ghost ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postBody)
      });

      if (response.ok) {
        const data = await response.json() as GhostPostResponse;
        const post = data.posts[0];
        return {
          ghostPostId: post.id,
          slug: post.slug,
          url: post.url
        };
      }

      if (response.status === 401 || response.status === 403) {
        throw new GhostPublisherError('Ghost API authentication failed');
      }

      // Retry on 5xx errors
      if (response.status >= 500) {
        const errorData = await response.json() as GhostErrorResponse;
        lastError = new GhostPublisherError(
          `Ghost API error (${response.status}): ${errorData.errors?.[0]?.message ?? 'Unknown error'}`
        );
        continue;
      }

      // Non-retryable error
      const errorData = await response.json() as GhostErrorResponse;
      throw new GhostPublisherError(
        `Ghost API error (${response.status}): ${errorData.errors?.[0]?.message ?? 'Unknown error'}`
      );
    }

    throw lastError ?? new GhostPublisherError('Ghost API request failed after retries');
  }

  validate(config: AgentConfig): ValidationResult {
    const errors: string[] = [];

    if (!config.apiUrl) {
      errors.push('apiUrl is required');
    }
    if (!config.adminApiKey) {
      errors.push('adminApiKey is required');
    }
    if (!config.reviewMode || !['auto_publish', 'draft_for_review'].includes(config.reviewMode as string)) {
      errors.push('reviewMode must be "auto_publish" or "draft_for_review"');
    }

    return errors.length > 0
      ? { valid: false, errors }
      : { valid: true };
  }
}
