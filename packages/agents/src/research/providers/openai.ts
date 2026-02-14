import type { ResearchProvider, Citation, ProviderResult } from '../research.agent.js';

type FetchFn = (url: string, init?: RequestInit) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export function createOpenAIProvider(apiKey: string, fetchFn: FetchFn): ResearchProvider {
  return {
    name: 'openai',
    async query(query: string): Promise<ProviderResult> {
      const response = await fetchFn('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: `Research: ${query}` }]
        })
      });

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
    }
  };
}
