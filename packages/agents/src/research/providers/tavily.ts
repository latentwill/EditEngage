import type { ResearchProvider, Citation, ProviderResult } from '../research.agent.js';

type FetchFn = (url: string, init?: RequestInit) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

interface TavilyResult {
  url: string;
  title: string;
  content: string;
}

interface TavilyResponse {
  results: TavilyResult[];
}

export function createTavilyProvider(apiKey: string, fetchFn: FetchFn): ResearchProvider {
  return {
    name: 'tavily',
    async query(query: string): Promise<ProviderResult> {
      const response = await fetchFn('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: 'advanced'
        })
      });

      const data = await response.json() as TavilyResponse;
      const results: Citation[] = (data.results ?? []).map((r) => ({
        url: r.url,
        title: r.title,
        snippet: r.content.substring(0, 500),
        provider: 'tavily'
      }));

      return { results };
    }
  };
}
