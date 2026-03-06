import Logfire from '@pydantic/logfire-node';
import type { Span } from '@opentelemetry/api';
import type { ProviderResult } from '../research.agent.js';

interface LlmSpanOptions {
  provider: string;
  model: string;
  promptLength: number;
  fn: (span: Span) => Promise<ProviderResult>;
}

export function withLlmSpan({ provider, model, promptLength, fn }: LlmSpanOptions): Promise<ProviderResult> {
  return Logfire.span('llm.call', {
    attributes: {
      'llm.provider': provider,
      'llm.model': model,
      'llm.prompt_length': promptLength,
    },
    callback: async (span: Span) => {
      try {
        return await fn(span);
      } catch (error) {
        span.recordException(error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    },
  });
}
