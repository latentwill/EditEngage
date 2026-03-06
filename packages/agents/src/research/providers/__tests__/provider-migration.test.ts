/**
 * @behavior Research providers route LLM calls through the Python service
 * @business_rule All LLM calls are centralized through the Python microservice
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@pydantic/logfire-node', () => ({
  default: {
    span: vi.fn((_name: string, _opts: unknown) => {
      const cb = typeof _opts === 'function' ? _opts : (_opts as Record<string, unknown>).callback;
      const fakeSpan = { setAttributes: vi.fn(), recordException: vi.fn() };
      return (cb as (s: unknown) => unknown)(fakeSpan);
    })
  }
}));

vi.mock('@opentelemetry/api', () => ({
  propagation: {
    inject: vi.fn((_ctx: unknown, carrier: Record<string, string>) => {
      carrier['traceparent'] = '00-mock-trace-01';
    })
  },
  context: {
    active: vi.fn().mockReturnValue({})
  }
}));

const LLM_SERVICE_URL = 'http://llm-service:8000';

describe('Provider migration to Python service', () => {
  let mockFetchFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LLM_SERVICE_URL = LLM_SERVICE_URL;
    mockFetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'test response' } }]
      })
    });
  });

  describe('OpenRouter provider', () => {
    it('calls Python service URL instead of OpenRouter API', async () => {
      const { createOpenRouterProvider } = await import('../openrouter.js');
      const provider = createOpenRouterProvider(mockFetchFn);
      await provider.query('test query');

      expect(mockFetchFn).toHaveBeenCalledWith(
        `${LLM_SERVICE_URL}/v1/chat/completions`,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('does not send Authorization header', async () => {
      const { createOpenRouterProvider } = await import('../openrouter.js');
      const provider = createOpenRouterProvider(mockFetchFn);
      await provider.query('test query');

      const callArgs = mockFetchFn.mock.calls[0][1] as { headers: Record<string, string> };
      expect(callArgs.headers).not.toHaveProperty('Authorization');
    });

    it('includes traceparent header', async () => {
      const { createOpenRouterProvider } = await import('../openrouter.js');
      const provider = createOpenRouterProvider(mockFetchFn);
      await provider.query('test query');

      const callArgs = mockFetchFn.mock.calls[0][1] as { headers: Record<string, string> };
      expect(callArgs.headers['traceparent']).toBe('00-mock-trace-01');
    });
  });

  describe('OpenAI provider', () => {
    it('calls Python service URL instead of OpenAI API', async () => {
      const { createOpenAIProvider } = await import('../openai.js');
      const provider = createOpenAIProvider(mockFetchFn);
      await provider.query('test query');

      expect(mockFetchFn).toHaveBeenCalledWith(
        `${LLM_SERVICE_URL}/v1/chat/completions`,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('includes traceparent header', async () => {
      const { createOpenAIProvider } = await import('../openai.js');
      const provider = createOpenAIProvider(mockFetchFn);
      await provider.query('test query');

      const callArgs = mockFetchFn.mock.calls[0][1] as { headers: Record<string, string> };
      expect(callArgs.headers['traceparent']).toBe('00-mock-trace-01');
    });
  });

  describe('Perplexity provider', () => {
    it('calls Python service URL instead of Perplexity API', async () => {
      const { createPerplexityProvider } = await import('../perplexity.js');
      const provider = createPerplexityProvider(mockFetchFn);
      await provider.query('test query');

      expect(mockFetchFn).toHaveBeenCalledWith(
        `${LLM_SERVICE_URL}/v1/chat/completions`,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('includes traceparent header', async () => {
      const { createPerplexityProvider } = await import('../perplexity.js');
      const provider = createPerplexityProvider(mockFetchFn);
      await provider.query('test query');

      const callArgs = mockFetchFn.mock.calls[0][1] as { headers: Record<string, string> };
      expect(callArgs.headers['traceparent']).toBe('00-mock-trace-01');
    });
  });
});
