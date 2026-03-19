import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@opentelemetry/api', () => ({
  propagation: { inject: vi.fn() },
  context: { active: vi.fn().mockReturnValue({}) }
}));

import { SeoWriterAgent } from './seo-writer.agent.js';
import type { TopicRow } from '../types.js';
import type { VarietyHints } from '../variety-engine/hooks.js';

/**
 * @behavior SEO writer LLM calls are wrapped in Logfire 'llm.call' spans
 * with writing style ID attribute for per-style cost tracking
 * @business_rule All LLM calls must be observable; SEO writer spans
 * include writingStyleId for granular analytics
 */

vi.mock('@pydantic/logfire-node', () => {
  const mockSpan = vi.fn(
    (
      _msgTemplate: string,
      options: { callback: (span: { setAttributes: ReturnType<typeof vi.fn> }) => unknown }
    ) => {
      const spanObj = { setAttributes: vi.fn() };
      return options.callback(spanObj);
    }
  );

  return {
    default: { span: mockSpan },
    span: mockSpan,
  };
});

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const Logfire = (await import('@pydantic/logfire-node')).default;

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
  created_at: '2025-01-01T00:00:00Z',
};

const mockHints: VarietyHints = {
  structureHint: 'Use a step-by-step tutorial format',
  exampleSeed: 'A real-world typescript scenario focusing on generics',
  avoidList: ['basics', 'types'],
};

const mockArticleResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          title: 'Advanced TypeScript Patterns for Production Apps',
          body: '<h2>Introduction</h2><p>TypeScript patterns help build robust apps.</p>',
          metaDescription: 'Learn advanced TypeScript patterns.',
          tags: ['typescript', 'patterns'],
          seoScore: 88,
          suggestedTopics: ['Topic 1', 'Topic 2', 'Topic 3', 'Topic 4', 'Topic 5'],
        }),
      },
    },
  ],
};

function createMockSupabase() {
  const singleMock = vi.fn().mockResolvedValue({
    data: {
      id: 'style-1',
      name: 'Professional',
      tone: 'authoritative',
      avoid_phrases: [],
      voice_guidelines: 'Write in active voice.',
    },
    error: null,
  });
  const eqMock = vi.fn().mockReturnValue({ single: singleMock });
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
  const fromMock = vi.fn().mockReturnValue({ select: selectMock });
  return { from: fromMock };
}

function createMockFetch() {
  return vi.fn().mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('/v1/chat/completions')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockArticleResponse),
      });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
  });
}

describe('SeoWriterAgent tracing', () => {
  let agent: SeoWriterAgent;
  let mockFetch: ReturnType<typeof createMockFetch>;
  let supabase: ReturnType<typeof createMockSupabase>;

  const config = {
    writingStyleId: 'style-1',
    serpResearch: false,
      };

  const input = {
    topic: mockTopic,
    canonical: 'optimize | typescript | patterns',
    hints: mockHints,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = createMockFetch();
    supabase = createMockSupabase();
    agent = new SeoWriterAgent(supabase as never, mockFetch as never);
  });

  it('creates an llm.call span with correct attributes including writingStyleId', async () => {
    await agent.execute(input, config);

    expect(Logfire.span).toHaveBeenCalledTimes(1);
    const [msgTemplate, options] = (Logfire.span as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { attributes: Record<string, unknown> },
    ];

    expect(msgTemplate).toBe('llm.call');
    expect(options.attributes).toEqual(
      expect.objectContaining({
        'llm.provider': 'openrouter',
        'llm.model': 'anthropic/claude-sonnet-4',
        'seo_writer.writing_style_id': 'style-1',
      })
    );
    expect(options.attributes['llm.prompt_length']).toBeGreaterThan(0);
  });

  it('uses consistent span naming with other agents (llm.call name and attribute keys)', async () => {
    await agent.execute(input, config);

    const [msgTemplate, options] = (Logfire.span as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { attributes: Record<string, unknown> },
    ];

    // Same span name as synthesizer and other agents
    expect(msgTemplate).toBe('llm.call');
    // Same base attribute keys
    expect(options.attributes).toHaveProperty('llm.provider');
    expect(options.attributes).toHaveProperty('llm.model');
    expect(options.attributes).toHaveProperty('llm.prompt_length');
  });

  it('sets response status attribute on the span after fetch completes', async () => {
    const capturedSpan = { setAttributes: vi.fn() };
    (Logfire.span as ReturnType<typeof vi.fn>).mockImplementation(
      (
        _msg: string,
        opts: { callback: (span: { setAttributes: ReturnType<typeof vi.fn> }) => unknown }
      ) => {
        return opts.callback(capturedSpan);
      }
    );

    await agent.execute(input, config);

    expect(capturedSpan.setAttributes).toHaveBeenCalledWith({
      'llm.response_status': 'ok',
    });
  });
});
