import type { ResearchProvider, Citation, ProviderResult } from '../research.agent.js';
import { withLlmSpan } from './tracing.js';
import { injectTraceHeaders } from './traceparent.js';

type FetchFn = (url: string, init?: RequestInit) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  citations?: string[];
}

const MODEL = 'llama-3.1-sonar-large-128k-online';

export function createPerplexityProvider(fetchFn: FetchFn): ResearchProvider {
  return {
    name: 'perplexity',
    async query(query: string): Promise<ProviderResult> {
      return withLlmSpan({
        provider: 'perplexity',
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
            throw new Error(`LLM service error for perplexity: ${JSON.stringify(errorBody)}`);
          }

          const data = await response.json() as PerplexityResponse;
          const content = data.choices[0]?.message?.content ?? '';
          const citations = data.citations ?? [];

          const results: Citation[] = citations.map((url, i) => ({
            url,
            title: `Perplexity Source ${i + 1}`,
            snippet: content.substring(0, 200),
            provider: 'perplexity'
          }));

          if (results.length === 0 && content) {
            results.push({
              url: '',
              title: 'Perplexity Research',
              snippet: content.substring(0, 500),
              provider: 'perplexity'
            });
          }

          return { results };
        },
      });
    }
  };
}
