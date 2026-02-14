import type { ResearchProvider, Citation, ProviderResult } from '../research.agent.js';

type FetchFn = (url: string, init?: RequestInit) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  citations?: string[];
}

export function createPerplexityProvider(apiKey: string, fetchFn: FetchFn): ResearchProvider {
  return {
    name: 'perplexity',
    async query(query: string): Promise<ProviderResult> {
      const response = await fetchFn('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-large-128k-online',
          messages: [{ role: 'user', content: `Research: ${query}` }]
        })
      });

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
    }
  };
}
