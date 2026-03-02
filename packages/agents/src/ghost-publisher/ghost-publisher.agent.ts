import crypto from 'node:crypto';
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
const JWT_EXPIRY_SECONDS = 300;

export function createJwt(apiKey: string): string {
  const [id, secret] = apiKey.split(':');

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: id })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    iat: now,
    exp: now + JWT_EXPIRY_SECONDS,
    aud: '/admin/'
  })).toString('base64url');

  const signingInput = `${header}.${payload}`;
  const secretBuffer = Buffer.from(secret, 'hex');
  const signature = crypto.createHmac('sha256', secretBuffer).update(signingInput).digest('base64url');

  return `${signingInput}.${signature}`;
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
    const cfg = config ?? {
      apiUrl: '',
      adminApiKey: ':',  // id:secret format -- empty fallback
      reviewMode: 'draft_for_review' as const
    };

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

      const errorData = await response.json() as GhostErrorResponse;
      const errorMessage = errorData.errors?.[0]?.message ?? 'Unknown error';
      const apiError = new GhostPublisherError(
        `Ghost API error (${response.status}): ${errorMessage}`
      );

      // Retry on 5xx server errors only
      if (response.status >= 500) {
        lastError = apiError;
        continue;
      }

      // Non-retryable client error
      throw apiError;
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
