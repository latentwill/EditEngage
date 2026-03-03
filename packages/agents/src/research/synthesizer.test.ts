/**
 * @behavior Synthesizer creates LLM prompts with citation attribution for source traceability
 * @business_rule The synthesis prompt must include citation dates and relevance scores when available
 */
import { describe, it, expect, vi } from 'vitest';
import { createSynthesizer } from './synthesizer.js';
import type { Citation } from './research.agent.js';

function createMockFetch(responseContent: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      choices: [{ message: { content: responseContent } }]
    })
  });
}

describe('createSynthesizer', () => {
  /**
   * @behavior Synthesizer includes citation date and relevance_score in the LLM prompt when available
   * @business_rule Source attribution metadata helps the LLM prioritize and attribute findings correctly
   */
  it('should include date and relevance_score in synthesis prompt when available', async () => {
    const mockFetch = createMockFetch('Synthesized brief with attribution.');
    const synthesize = createSynthesizer('test-api-key', mockFetch);

    const citations: Citation[] = [
      {
        url: 'https://example.com/article',
        title: 'Recent Article',
        snippet: 'Important finding',
        provider: 'perplexity',
        date: '2026-02-15',
        relevance_score: 0.92
      },
      {
        url: 'https://example.com/old',
        title: 'Older Source',
        snippet: 'Background info',
        provider: 'tavily'
      }
    ];

    await synthesize('test query', citations);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    const prompt = callBody.messages[0].content;

    // Citation with date and relevance should include them
    expect(prompt).toContain('2026-02-15');
    expect(prompt).toContain('0.92');

    // Citation without date/relevance should still be included
    expect(prompt).toContain('Older Source');
    expect(prompt).toContain('Background info');
  });

  /**
   * @behavior Synthesizer returns the LLM response content as the brief text
   * @business_rule The synthesized brief must be the direct output from the LLM
   */
  it('should return the LLM response as the brief', async () => {
    const mockFetch = createMockFetch('This is the synthesized brief.');
    const synthesize = createSynthesizer('test-api-key', mockFetch);

    const result = await synthesize('query', [
      { url: 'https://example.com', title: 'Source', snippet: 'Info', provider: 'perplexity' }
    ]);

    expect(result).toBe('This is the synthesized brief.');
  });
});
