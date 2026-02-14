import { AgentType, type Agent, type AgentConfig, type ValidationResult } from '../types.js';

export class PostBridgePublisherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PostBridgePublisherError';
  }
}

export interface PostBridgePublisherInput {
  content: string;
  platforms: string[];
  url: string;
}

export interface PostBridgePublisherOutput {
  posts: Array<{ platform: string; postId: string }>;
}

export interface PostBridgePublisherConfig extends AgentConfig {
  apiUrl: string;
  apiKey: string;
}

type FetchFn = (url: string, init?: RequestInit) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

const PLATFORM_LIMITS: Record<string, number> = {
  twitter: 280,
  linkedin: 3000
};

function formatForPlatform(content: string, articleUrl: string, platforms: string[]): string {
  const mostRestrictiveLimit = Math.min(
    ...platforms.map(p => PLATFORM_LIMITS[p] ?? Infinity)
  );

  const fullContent = `${content} ${articleUrl}`;

  if (mostRestrictiveLimit === Infinity || fullContent.length <= mostRestrictiveLimit) {
    return fullContent;
  }

  // Reserve space for: "..." + " " + url
  const reservedLength = 3 + 1 + articleUrl.length;
  const availableForContent = mostRestrictiveLimit - reservedLength;
  const truncatedContent = content.slice(0, availableForContent);
  return `${truncatedContent}... ${articleUrl}`;
}

export class PostBridgePublisherAgent implements Agent<PostBridgePublisherInput, PostBridgePublisherOutput> {
  type = AgentType.POSTBRIDGE_PUBLISHER;

  private fetchFn: FetchFn;

  constructor(fetchFn: FetchFn) {
    this.fetchFn = fetchFn;
  }

  async execute(
    input: PostBridgePublisherInput,
    config?: PostBridgePublisherConfig
  ): Promise<PostBridgePublisherOutput> {
    const cfg = config ?? { apiUrl: '', apiKey: '' };

    const url = `${cfg.apiUrl}/api/v1/publish`;

    const response = await this.fetchFn(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: formatForPlatform(input.content, input.url, input.platforms),
        platforms: input.platforms,
        url: input.url
      })
    });

    if (!response.ok) {
      const errorData = await response.json() as { error?: string };
      throw new PostBridgePublisherError(
        `Post Bridge API error (${response.status}): ${errorData.error ?? 'Unknown error'}`
      );
    }

    const data = await response.json() as { results: Array<{ platform: string; postId: string }> };
    return { posts: data.results };
  }

  validate(config: AgentConfig): ValidationResult {
    const errors: string[] = [];
    if (!config.apiUrl) errors.push('apiUrl is required');
    if (!config.apiKey) errors.push('apiKey is required');
    return errors.length > 0 ? { valid: false, errors } : { valid: true };
  }
}
