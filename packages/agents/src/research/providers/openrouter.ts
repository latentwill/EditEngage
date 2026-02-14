import type { ResearchProvider, Citation, ProviderResult } from '../research.agent.js';

type FetchFn = (url: string, init?: RequestInit) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export function createOpenRouterProvider(apiKey: string, fetchFn: FetchFn): ResearchProvider {
  return {
    name: 'openrouter',
    async query(query: string): Promise<ProviderResult> {
      const response = await fetchFn('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-sonnet-4-20250514',
          messages: [{ role: 'user', content: `Research: ${query}` }]
        })
      });

      const data = await response.json() as OpenRouterResponse;
      const content = data.choices[0]?.message?.content ?? '';

      const results: Citation[] = [];
      if (content) {
        results.push({
          url: '',
          title: 'OpenRouter Research',
          snippet: content.substring(0, 500),
          provider: 'openrouter'
        });
      }

      return { results };
    }
  };
}
