import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('@opentelemetry/api', () => ({
  propagation: { inject: vi.fn() },
  context: { active: vi.fn().mockReturnValue({}) }
}));

import { createOpenRouterProvider } from '../openrouter.js';
import { createOpenAIProvider } from '../openai.js';
import { createPerplexityProvider } from '../perplexity.js';

// Mock Logfire at the module level
vi.mock('@pydantic/logfire-node', () => {
  const mockSpan = vi.fn();
  return {
    default: { span: mockSpan },
    span: mockSpan,
  };
});

import Logfire from '@pydantic/logfire-node';

function makeFetchFn(response: Record<string, unknown> = {}, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(response),
  });
}

function defaultChatResponse(content = 'some research result') {
  return {
    choices: [{ message: { content } }],
  };
}

function perplexityChatResponse(content = 'some research result', citations: string[] = []) {
  return {
    choices: [{ message: { content } }],
    citations,
  };
}

describe('Provider tracing with Logfire', () => {
  let mockSpan: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSpan = Logfire.span as Mock;
    // By default, make span execute the callback and return its result
    mockSpan.mockImplementation((_msg: string, opts: { callback: (span: { setAttributes: Mock }) => unknown }) => {
      const fakeSpan = { setAttributes: vi.fn() };
      return opts.callback(fakeSpan);
    });
  });

  describe('OpenRouter provider', () => {
    it('creates an llm.call span with correct attributes', async () => {
      const fetchFn = makeFetchFn(defaultChatResponse());
      const provider = createOpenRouterProvider(fetchFn);

      await provider.query('test query');

      expect(mockSpan).toHaveBeenCalledTimes(1);
      expect(mockSpan).toHaveBeenCalledWith(
        'llm.call',
        expect.objectContaining({
          attributes: expect.objectContaining({
            'llm.provider': 'openrouter',
            'llm.model': 'anthropic/claude-sonnet-4-20250514',
            'llm.prompt_length': 'test query'.length,
          }),
          callback: expect.any(Function),
        })
      );
    });

    it('sets response_status ok on successful response', async () => {
      const fakeSpan = { setAttributes: vi.fn() };
      mockSpan.mockImplementation((_msg: string, opts: { callback: (span: typeof fakeSpan) => unknown }) => {
        return opts.callback(fakeSpan);
      });

      const fetchFn = makeFetchFn(defaultChatResponse(), true);
      const provider = createOpenRouterProvider(fetchFn);

      await provider.query('test query');

      expect(fakeSpan.setAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ 'llm.response_status': 'ok' })
      );
    });

    it('sets response_status error on failed response and throws', async () => {
      const fakeSpan = { setAttributes: vi.fn(), recordException: vi.fn() };
      mockSpan.mockImplementation((_msg: string, opts: { callback: (span: typeof fakeSpan) => unknown }) => {
        return opts.callback(fakeSpan);
      });

      const fetchFn = makeFetchFn(defaultChatResponse(), false);
      const provider = createOpenRouterProvider(fetchFn);

      await expect(provider.query('test query')).rejects.toThrow('LLM service error');

      expect(fakeSpan.setAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ 'llm.response_status': 'error' })
      );
    });

    it('records errors on the span when fetch throws', async () => {
      const fakeSpan = { setAttributes: vi.fn(), recordException: vi.fn() };
      mockSpan.mockImplementation((_msg: string, opts: { callback: (span: typeof fakeSpan) => unknown }) => {
        return opts.callback(fakeSpan);
      });

      const fetchFn = vi.fn().mockRejectedValue(new Error('network failure'));
      const provider = createOpenRouterProvider(fetchFn);

      await expect(provider.query('test query')).rejects.toThrow('network failure');

      expect(fakeSpan.recordException).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('OpenAI provider', () => {
    it('creates an llm.call span with correct attributes', async () => {
      const fetchFn = makeFetchFn(defaultChatResponse());
      const provider = createOpenAIProvider(fetchFn);

      await provider.query('test query');

      expect(mockSpan).toHaveBeenCalledTimes(1);
      expect(mockSpan).toHaveBeenCalledWith(
        'llm.call',
        expect.objectContaining({
          attributes: expect.objectContaining({
            'llm.provider': 'openai',
            'llm.model': 'gpt-4o',
            'llm.prompt_length': 'test query'.length,
          }),
          callback: expect.any(Function),
        })
      );
    });

    it('sets response_status ok on successful response', async () => {
      const fakeSpan = { setAttributes: vi.fn() };
      mockSpan.mockImplementation((_msg: string, opts: { callback: (span: typeof fakeSpan) => unknown }) => {
        return opts.callback(fakeSpan);
      });

      const fetchFn = makeFetchFn(defaultChatResponse(), true);
      const provider = createOpenAIProvider(fetchFn);

      await provider.query('test query');

      expect(fakeSpan.setAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ 'llm.response_status': 'ok' })
      );
    });

    it('sets response_status error on failed response and throws', async () => {
      const fakeSpan = { setAttributes: vi.fn(), recordException: vi.fn() };
      mockSpan.mockImplementation((_msg: string, opts: { callback: (span: typeof fakeSpan) => unknown }) => {
        return opts.callback(fakeSpan);
      });

      const fetchFn = makeFetchFn(defaultChatResponse(), false);
      const provider = createOpenAIProvider(fetchFn);

      await expect(provider.query('test query')).rejects.toThrow('LLM service error');

      expect(fakeSpan.setAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ 'llm.response_status': 'error' })
      );
    });

    it('records errors on the span when fetch throws', async () => {
      const fakeSpan = { setAttributes: vi.fn(), recordException: vi.fn() };
      mockSpan.mockImplementation((_msg: string, opts: { callback: (span: typeof fakeSpan) => unknown }) => {
        return opts.callback(fakeSpan);
      });

      const fetchFn = vi.fn().mockRejectedValue(new Error('timeout'));
      const provider = createOpenAIProvider(fetchFn);

      await expect(provider.query('test query')).rejects.toThrow('timeout');

      expect(fakeSpan.recordException).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Perplexity provider', () => {
    it('creates an llm.call span with correct attributes', async () => {
      const fetchFn = makeFetchFn(perplexityChatResponse());
      const provider = createPerplexityProvider(fetchFn);

      await provider.query('test query');

      expect(mockSpan).toHaveBeenCalledTimes(1);
      expect(mockSpan).toHaveBeenCalledWith(
        'llm.call',
        expect.objectContaining({
          attributes: expect.objectContaining({
            'llm.provider': 'perplexity',
            'llm.model': 'llama-3.1-sonar-large-128k-online',
            'llm.prompt_length': 'test query'.length,
          }),
          callback: expect.any(Function),
        })
      );
    });

    it('sets response_status ok on successful response', async () => {
      const fakeSpan = { setAttributes: vi.fn() };
      mockSpan.mockImplementation((_msg: string, opts: { callback: (span: typeof fakeSpan) => unknown }) => {
        return opts.callback(fakeSpan);
      });

      const fetchFn = makeFetchFn(perplexityChatResponse('result', ['https://example.com']), true);
      const provider = createPerplexityProvider(fetchFn);

      await provider.query('test query');

      expect(fakeSpan.setAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ 'llm.response_status': 'ok' })
      );
    });

    it('sets response_status error on failed response and throws', async () => {
      const fakeSpan = { setAttributes: vi.fn(), recordException: vi.fn() };
      mockSpan.mockImplementation((_msg: string, opts: { callback: (span: typeof fakeSpan) => unknown }) => {
        return opts.callback(fakeSpan);
      });

      const fetchFn = makeFetchFn(perplexityChatResponse(), false);
      const provider = createPerplexityProvider(fetchFn);

      await expect(provider.query('test query')).rejects.toThrow('LLM service error');

      expect(fakeSpan.setAttributes).toHaveBeenCalledWith(
        expect.objectContaining({ 'llm.response_status': 'error' })
      );
    });

    it('records errors on the span when fetch throws', async () => {
      const fakeSpan = { setAttributes: vi.fn(), recordException: vi.fn() };
      mockSpan.mockImplementation((_msg: string, opts: { callback: (span: typeof fakeSpan) => unknown }) => {
        return opts.callback(fakeSpan);
      });

      const fetchFn = vi.fn().mockRejectedValue(new Error('dns error'));
      const provider = createPerplexityProvider(fetchFn);

      await expect(provider.query('test query')).rejects.toThrow('dns error');

      expect(fakeSpan.recordException).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
