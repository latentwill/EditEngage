/**
 * @behavior Research providers throw when the LLM service returns a non-200 response
 * @business_rule Errors from the LLM service must propagate so callers can retry or report failures
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@pydantic/logfire-node', () => ({
  default: {
    span: vi.fn((_name: string, opts: { callback: (span: { setAttributes: ReturnType<typeof vi.fn>; recordException: ReturnType<typeof vi.fn> }) => unknown }) => {
      const fakeSpan = { setAttributes: vi.fn(), recordException: vi.fn() };
      return opts.callback(fakeSpan);
    })
  }
}));

vi.mock('@opentelemetry/api', () => ({
  propagation: { inject: vi.fn() },
  context: { active: vi.fn().mockReturnValue({}) }
}));

import { createOpenRouterProvider } from '../openrouter.js';
import { createOpenAIProvider } from '../openai.js';
import { createPerplexityProvider } from '../perplexity.js';

function makeErrorFetchFn(errorBody: Record<string, unknown> = { error: 'rate limited' }) {
  return vi.fn().mockResolvedValue({
    ok: false,
    json: () => Promise.resolve(errorBody),
  });
}

describe('Provider error handling - non-ok responses must throw', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LLM_SERVICE_URL = 'http://llm-service:8000';
  });

  describe('OpenRouter provider', () => {
    it('throws when the LLM service returns a non-ok response', async () => {
      const fetchFn = makeErrorFetchFn({ error: 'rate limited' });
      const provider = createOpenRouterProvider(fetchFn);

      await expect(provider.query('test query')).rejects.toThrow('LLM service error');
    });

    it('includes the error body in the thrown error message', async () => {
      const fetchFn = makeErrorFetchFn({ error: 'model overloaded' });
      const provider = createOpenRouterProvider(fetchFn);

      await expect(provider.query('test query')).rejects.toThrow('model overloaded');
    });
  });

  describe('OpenAI provider', () => {
    it('throws when the LLM service returns a non-ok response', async () => {
      const fetchFn = makeErrorFetchFn({ error: 'rate limited' });
      const provider = createOpenAIProvider(fetchFn);

      await expect(provider.query('test query')).rejects.toThrow('LLM service error');
    });

    it('includes the error body in the thrown error message', async () => {
      const fetchFn = makeErrorFetchFn({ error: 'invalid api key' });
      const provider = createOpenAIProvider(fetchFn);

      await expect(provider.query('test query')).rejects.toThrow('invalid api key');
    });
  });

  describe('Perplexity provider', () => {
    it('throws when the LLM service returns a non-ok response', async () => {
      const fetchFn = makeErrorFetchFn({ error: 'rate limited' });
      const provider = createPerplexityProvider(fetchFn);

      await expect(provider.query('test query')).rejects.toThrow('LLM service error');
    });

    it('includes the error body in the thrown error message', async () => {
      const fetchFn = makeErrorFetchFn({ error: 'quota exceeded' });
      const provider = createPerplexityProvider(fetchFn);

      await expect(provider.query('test query')).rejects.toThrow('quota exceeded');
    });
  });

  describe('Error body parsing resilience', () => {
    it('still throws when the error response body is not valid JSON', async () => {
      const fetchFn = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      });
      const provider = createOpenAIProvider(fetchFn);

      await expect(provider.query('test query')).rejects.toThrow('LLM service error');
    });
  });
});
