import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SeoWriterAgent } from './seo-writer.agent.js';
import { AgentType, type TopicRow } from '../types.js';
import type { VarietyHints } from '../variety-engine/hooks.js';

const mockTopic: TopicRow = {
  id: 'topic-1',
  project_id: 'proj-1',
  pipeline_id: null,
  title: 'Advanced TypeScript Patterns',
  keywords: ['typescript', 'patterns', 'advanced'],
  seo_score: 85,
  status: 'in_progress',
  notes: null,
  completed_at: null,
  content_id: null,
  created_at: '2025-01-01T00:00:00Z'
};

const mockHints: VarietyHints = {
  structureHint: 'Use a step-by-step tutorial format',
  exampleSeed: 'A real-world typescript scenario focusing on generics',
  avoidList: ['basics', 'types']
};

const mockWritingStyle = {
  id: 'style-1',
  name: 'Professional',
  tone: 'authoritative',
  avoid_phrases: ['in conclusion', 'it is important to note', 'as we all know'],
  guidelines: 'Write in active voice. Keep paragraphs short.'
};

const mockArticleResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          title: 'Advanced TypeScript Patterns for Production Apps',
          body: '<h2>Introduction</h2><p>TypeScript patterns help build robust apps.</p>',
          metaDescription: 'Learn advanced TypeScript patterns for production applications.',
          tags: ['typescript', 'patterns', 'advanced', 'production'],
          seoScore: 88,
          suggestedTopics: [
            'TypeScript Generics Deep Dive',
            'TypeScript Decorators in Practice',
            'Type-Safe API Clients',
            'Advanced Type Inference',
            'TypeScript Compiler Plugins'
          ]
        })
      }
    }
  ]
};

const mockSerpResults = {
  organic: [
    { title: 'TS Patterns 1', snippet: 'Content...', wordCount: 1200 },
    { title: 'TS Patterns 2', snippet: 'Content...', wordCount: 1800 },
    { title: 'TS Patterns 3', snippet: 'Content...', wordCount: 1500 }
  ]
};

function createMockSupabase() {
  const selectSingle = {
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockWritingStyle, error: null })
  };

  return {
    from: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnValue(selectSingle)
    }))
  };
}

function createMockFetch(options: {
  openRouterResponse?: Record<string, unknown>;
  serpResponse?: Record<string, unknown>;
} = {}) {
  const {
    openRouterResponse = mockArticleResponse,
    serpResponse = mockSerpResults
  } = options;

  return vi.fn().mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('openrouter.ai')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(openRouterResponse)
      });
    }
    if (typeof url === 'string' && url.includes('serp')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(serpResponse)
      });
    }
    return Promise.resolve({ ok: false, status: 404 });
  });
}

describe('SeoWriterAgent', () => {
  let agent: SeoWriterAgent;
  let mockFetch: ReturnType<typeof createMockFetch>;
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = createMockFetch();
    supabase = createMockSupabase();
    agent = new SeoWriterAgent(supabase as never, mockFetch as never);
  });

  it('calls OpenRouter API with topic, variety hints, and writing style', async () => {
    await agent.execute(
      { topic: mockTopic, canonical: 'optimize | typescript | patterns', hints: mockHints },
      { writingStyleId: 'style-1', serpResearch: false, openrouterApiKey: 'test-key' }
    );

    const openRouterCall = mockFetch.mock.calls.find(
      (call: [string]) => call[0].includes('openrouter.ai')
    );
    expect(openRouterCall).toBeDefined();

    const [url, options] = openRouterCall as [string, RequestInit];
    expect(url).toContain('openrouter.ai/api/v1/chat/completions');

    const body = JSON.parse(options.body as string);
    const prompt = body.messages[0].content as string;
    expect(prompt).toContain('Advanced TypeScript Patterns');
    expect(prompt).toContain('step-by-step tutorial format');
    expect(prompt).toContain('authoritative');

    const headers = options.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-key');
  });

  it('returns article with title, body (HTML), meta_description, tags, seo_score', async () => {
    const result = await agent.execute(
      { topic: mockTopic, canonical: 'optimize | typescript | patterns', hints: mockHints },
      { writingStyleId: 'style-1', serpResearch: false, openrouterApiKey: 'test-key' }
    );

    expect(result.title).toBe('Advanced TypeScript Patterns for Production Apps');
    expect(result.body).toContain('<h2>');
    expect(result.metaDescription).toBeDefined();
    expect(result.metaDescription.length).toBeGreaterThan(0);
    expect(Array.isArray(result.tags)).toBe(true);
    expect(result.tags.length).toBeGreaterThan(0);
    expect(typeof result.seoScore).toBe('number');
  });

  it('performs SERP research when config.serpResearch is true', async () => {
    await agent.execute(
      { topic: mockTopic, canonical: 'optimize | typescript | patterns', hints: mockHints },
      { writingStyleId: 'style-1', serpResearch: true, openrouterApiKey: 'test-key', serpApiKey: 'serp-key' }
    );

    const serpCall = mockFetch.mock.calls.find(
      (call: [string]) => typeof call[0] === 'string' && call[0].includes('serp')
    );
    expect(serpCall).toBeDefined();
  });

  it('targets 15% above average word count from SERP analysis', async () => {
    await agent.execute(
      { topic: mockTopic, canonical: 'optimize | typescript | patterns', hints: mockHints },
      { writingStyleId: 'style-1', serpResearch: true, openrouterApiKey: 'test-key', serpApiKey: 'serp-key' }
    );

    // Average word count: (1200 + 1800 + 1500) / 3 = 1500
    // Target: 1500 * 1.15 = 1725
    const openRouterCall = mockFetch.mock.calls.find(
      (call: [string]) => call[0].includes('openrouter.ai')
    );
    const body = JSON.parse((openRouterCall as [string, RequestInit])[1].body as string);
    const prompt = body.messages[0].content as string;
    expect(prompt).toContain('1725');
  });

  it('avoids phrases listed in writing style avoid_phrases', async () => {
    await agent.execute(
      { topic: mockTopic, canonical: 'optimize | typescript | patterns', hints: mockHints },
      { writingStyleId: 'style-1', serpResearch: false, openrouterApiKey: 'test-key' }
    );

    const openRouterCall = mockFetch.mock.calls.find(
      (call: [string]) => call[0].includes('openrouter.ai')
    );
    const body = JSON.parse((openRouterCall as [string, RequestInit])[1].body as string);
    const prompt = body.messages[0].content as string;
    expect(prompt).toContain('in conclusion');
    expect(prompt).toContain('it is important to note');
    expect(prompt).toContain('as we all know');
  });

  it('generates 5 new topic suggestions added to topic queue', async () => {
    const result = await agent.execute(
      { topic: mockTopic, canonical: 'optimize | typescript | patterns', hints: mockHints },
      { writingStyleId: 'style-1', serpResearch: false, openrouterApiKey: 'test-key' }
    );

    expect(result.suggestedTopics).toBeDefined();
    expect(result.suggestedTopics).toHaveLength(5);
    expect(result.suggestedTopics[0]).toBe('TypeScript Generics Deep Dive');
  });

  it('throws error when LLM returns empty choices', async () => {
    const emptyChoicesFetch = createMockFetch({
      openRouterResponse: { choices: [] }
    });
    const emptyAgent = new SeoWriterAgent(supabase as never, emptyChoicesFetch as never);

    await expect(
      emptyAgent.execute(
        { topic: mockTopic, canonical: 'optimize | typescript | patterns', hints: mockHints },
        { writingStyleId: 'style-1', serpResearch: false, openrouterApiKey: 'test-key' }
      )
    ).rejects.toThrow('No response from LLM');
  });

  it('throws error when LLM returns invalid JSON', async () => {
    const invalidJsonFetch = createMockFetch({
      openRouterResponse: { choices: [{ message: { content: 'not valid json' } }] }
    });
    const invalidAgent = new SeoWriterAgent(supabase as never, invalidJsonFetch as never);

    await expect(
      invalidAgent.execute(
        { topic: mockTopic, canonical: 'optimize | typescript | patterns', hints: mockHints },
        { writingStyleId: 'style-1', serpResearch: false, openrouterApiKey: 'test-key' }
      )
    ).rejects.toThrow('Failed to parse LLM response as JSON');
  });
});
