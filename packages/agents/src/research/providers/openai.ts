import type { ResearchProvider, Citation, ProviderResult } from '../research.agent.js';
import { withLlmSpan } from './tracing.js';
import { injectTraceHeaders } from './traceparent.js';

type FetchFn = (url: string, init?: RequestInit) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const MODEL = 'gpt-4o';

export function createOpenAIProvider(fetchFn: FetchFn): ResearchProvider {
  return {
    name: 'openai',
    async query(query: string): Promise<ProviderResult> {
      return withLlmSpan({
        provider: 'openai',
        model: MODEL,
        promptLength: query.length,
        fn: async (span) => {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };
          injectTraceHeaders(headers);

          const llmServiceUrl = process.env.LLM_SERVICE_URL ?? 'http://llm-service:8000';
          const response = await fetchFn(`${llmServiceUrl}/v1/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: MODEL,
              messages: [{ role: 'user', content: `Research: ${query}` }]
            })
          });

          span.setAttributes({ 'llm.response_status': response.ok ? 'ok' : 'error' });

          if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(`LLM service error for openai: ${JSON.stringify(errorBody)}`);
          }

          const data = await response.json() as OpenAIResponse;
          const content = data.choices[0]?.message?.content ?? '';

          const results: Citation[] = [];
          if (content) {
            results.push({
              url: '',
              title: 'OpenAI Research',
              snippet: content.substring(0, 500),
              provider: 'openai'
            });
          }

          return { results };
        },
      });
    }
  };
}
