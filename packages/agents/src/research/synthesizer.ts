import type { Citation } from './research.agent.js';

type FetchFn = (url: string, init?: RequestInit) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

interface LLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export function createSynthesizer(apiKey: string, fetchFn: FetchFn): (query: string, citations: Citation[]) => Promise<string> {
  return async (query: string, citations: Citation[]): Promise<string> => {
    const citationText = citations
      .map((c, i) => `[${i + 1}] ${c.title} (${c.provider}): ${c.snippet}`)
      .join('\n');

    const response = await fetchFn('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-20250514',
        messages: [{
          role: 'user',
          content: `Synthesize a research brief for the query "${query}" from these sources:\n\n${citationText}\n\nProvide a unified, concise summary with key findings.`
        }]
      })
    });

    const data = await response.json() as LLMResponse;
    return data.choices[0]?.message?.content ?? '';
  };
}
