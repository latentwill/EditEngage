import Logfire from '@pydantic/logfire-node';
import type { Citation } from './research.agent.js';
import { injectTraceHeaders } from './providers/traceparent.js';

type FetchFn = (url: string, init?: RequestInit) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

interface LLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export function createSynthesizer(fetchFn: FetchFn): (query: string, citations: Citation[]) => Promise<string> {
  return async (query: string, citations: Citation[]): Promise<string> => {
    const citationText = citations
      .map((c, i) => {
        let entry = `[${i + 1}] ${c.title} (${c.provider}): ${c.snippet}`;
        if (c.date) {
          entry += ` [date: ${c.date}]`;
        }
        if (c.relevance_score != null) {
          entry += ` [relevance: ${c.relevance_score}]`;
        }
        return entry;
      })
      .join('\n');

    const prompt = `Synthesize a research brief for the query "${query}" from these sources:\n\n${citationText}\n\nProvide a unified, concise summary with key findings.`;

    const llmServiceUrl = process.env.LLM_SERVICE_URL ?? 'http://llm-service:8000';

    return Logfire.span('llm.call', {
      attributes: {
        'llm.provider': 'openrouter',
        'llm.model': 'anthropic/claude-sonnet-4-20250514',
        'llm.prompt_length': prompt.length,
      },
      callback: async (span) => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        injectTraceHeaders(headers);

        const response = await fetchFn(`${llmServiceUrl}/v1/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: 'anthropic/claude-sonnet-4-20250514',
            messages: [{
              role: 'user',
              content: prompt
            }]
          })
        });

        span.setAttributes({ 'llm.response_status': response.ok ? 'ok' : 'error' });

        const data = await response.json() as LLMResponse;
        return data.choices[0]?.message?.content ?? '';
      },
    });
  };
}
