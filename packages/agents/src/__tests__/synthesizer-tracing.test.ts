import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@opentelemetry/api', () => ({
  propagation: { inject: vi.fn() },
  context: { active: vi.fn().mockReturnValue({}) }
}));

import { createSynthesizer } from '../research/synthesizer.js';
import type { Citation } from '../research/research.agent.js';

/**
 * @behavior Synthesizer LLM calls are wrapped in Logfire 'llm.call' spans
 * @business_rule All LLM calls must be observable via distributed tracing
 * for cost tracking, latency monitoring, and debugging
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

describe('Synthesizer tracing', () => {
  const mockCitations: Citation[] = [
    {
      title: 'Test Source',
      url: 'https://example.com',
      snippet: 'Test snippet content',
      provider: 'test-provider',
    },
  ];

  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: 'Synthesized research brief.' } }],
        }),
    });
  });

  it('creates an llm.call span with correct attributes when synthesizing', async () => {
    const synthesize = createSynthesizer(mockFetch);
    await synthesize('test query', mockCitations);

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
      })
    );
    expect(options.attributes['llm.prompt_length']).toBeGreaterThan(0);
  });

  it('sets response status attribute on the span after fetch completes', async () => {
    const synthesize = createSynthesizer(mockFetch);
    await synthesize('test query', mockCitations);

    const options = (Logfire.span as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      callback: (span: { setAttributes: ReturnType<typeof vi.fn> }) => unknown;
    };

    // The mock invokes callback with a span object that records setAttributes calls
    // We need to re-invoke to capture the span object
    const capturedSpan = { setAttributes: vi.fn() };
    // The mock already ran; check the span's setAttributes was called during execution
    // Since our mock calls callback synchronously, we verify via the mock implementation
    // Re-run with a fresh span to verify
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: 'Brief.' } }],
        }),
    });

    // Replace span mock to capture the span object
    (Logfire.span as ReturnType<typeof vi.fn>).mockImplementation(
      (
        _msg: string,
        opts: { callback: (span: { setAttributes: ReturnType<typeof vi.fn> }) => unknown }
      ) => {
        return opts.callback(capturedSpan);
      }
    );

    const synthesize2 = createSynthesizer(mockFetch);
    await synthesize2('test query', mockCitations);

    expect(capturedSpan.setAttributes).toHaveBeenCalledWith({
      'llm.response_status': 'ok',
    });
  });

  it('sets response status to error when fetch response is not ok', async () => {
    const errorFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: 'Error response.' } }],
        }),
    });

    const capturedSpan = { setAttributes: vi.fn() };
    (Logfire.span as ReturnType<typeof vi.fn>).mockImplementation(
      (
        _msg: string,
        opts: { callback: (span: { setAttributes: ReturnType<typeof vi.fn> }) => unknown }
      ) => {
        return opts.callback(capturedSpan);
      }
    );

    const synthesize = createSynthesizer(errorFetch);
    await synthesize('test query', mockCitations);

    expect(capturedSpan.setAttributes).toHaveBeenCalledWith({
      'llm.response_status': 'error',
    });
  });
});
