import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResearchAgent } from './research.agent.js';
import { AgentType } from '../types.js';
import type { ResearchProvider, Citation, ResearchBrief } from './research.agent.js';

function createMockProvider(
  name: string,
  results: Citation[],
  shouldFail = false
): ResearchProvider {
  return {
    name,
    query: shouldFail
      ? vi.fn().mockRejectedValue(new Error(`${name} unavailable`))
      : vi.fn().mockResolvedValue({ results })
  };
}

function createMockSynthesizer() {
  return vi.fn().mockResolvedValue('Synthesized research brief combining all sources.');
}

const perplexityCitations: Citation[] = [
  { url: 'https://perplexity.example.com/1', title: 'Perplexity Result 1', snippet: 'Snippet from Perplexity', provider: 'perplexity' }
];

const openaiCitations: Citation[] = [
  { url: 'https://openai.example.com/1', title: 'OpenAI Result 1', snippet: 'Snippet from OpenAI', provider: 'openai' }
];

const tavilyCitations: Citation[] = [
  { url: 'https://tavily.example.com/1', title: 'Tavily Result 1', snippet: 'Snippet from Tavily', provider: 'tavily' }
];

const openrouterCitations: Citation[] = [
  { url: 'https://openrouter.example.com/1', title: 'OpenRouter Result 1', snippet: 'Snippet from OpenRouter', provider: 'openrouter' }
];

/**
 * @behavior Research Agent queries multiple providers and aggregates results into a unified brief
 * @business_rule Research must fan out to all configured providers in parallel for speed and coverage
 */
describe('ResearchAgent', () => {
  let agent: ResearchAgent;
  let perplexityProvider: ResearchProvider;
  let openaiProvider: ResearchProvider;
  let tavilyProvider: ResearchProvider;
  let openrouterProvider: ResearchProvider;
  let synthesizer: ReturnType<typeof createMockSynthesizer>;

  beforeEach(() => {
    vi.clearAllMocks();
    perplexityProvider = createMockProvider('perplexity', perplexityCitations);
    openaiProvider = createMockProvider('openai', openaiCitations);
    tavilyProvider = createMockProvider('tavily', tavilyCitations);
    openrouterProvider = createMockProvider('openrouter', openrouterCitations);
    synthesizer = createMockSynthesizer();

    agent = new ResearchAgent({
      providers: [perplexityProvider, openaiProvider, tavilyProvider, openrouterProvider],
      synthesizer
    });
  });

  /**
   * @behavior Research Agent queries all configured providers in parallel
   * @business_rule All providers must be queried concurrently to minimize latency
   */
  it('queries all configured providers in parallel', async () => {
    await agent.execute({ query: 'TypeScript best practices 2026', synthesize: false });

    expect(perplexityProvider.query).toHaveBeenCalledWith('TypeScript best practices 2026');
    expect(openaiProvider.query).toHaveBeenCalledWith('TypeScript best practices 2026');
    expect(tavilyProvider.query).toHaveBeenCalledWith('TypeScript best practices 2026');
    expect(openrouterProvider.query).toHaveBeenCalledWith('TypeScript best practices 2026');
  });

  /**
   * @behavior Research Agent aggregates results from multiple providers
   * @business_rule All provider results must be merged into a single citations array
   */
  it('aggregates results from multiple providers', async () => {
    const result = await agent.execute({ query: 'TypeScript best practices 2026', synthesize: false });

    expect(result.citations).toHaveLength(4);
    expect(result.citations).toContainEqual(perplexityCitations[0]);
    expect(result.citations).toContainEqual(openaiCitations[0]);
    expect(result.citations).toContainEqual(tavilyCitations[0]);
    expect(result.citations).toContainEqual(openrouterCitations[0]);
  });

  /**
   * @behavior Research Agent synthesizes a single brief when synthesize is true
   * @business_rule When synthesis is requested, an LLM must produce a unified brief from all citations
   */
  it('synthesizes a single brief when synthesize is true', async () => {
    const result = await agent.execute({ query: 'TypeScript best practices 2026', synthesize: true });

    expect(synthesizer).toHaveBeenCalledTimes(1);
    expect(synthesizer).toHaveBeenCalledWith(
      'TypeScript best practices 2026',
      expect.arrayContaining([
        expect.objectContaining({ provider: 'perplexity' }),
        expect.objectContaining({ provider: 'openai' })
      ])
    );
    expect(result.brief).toBe('Synthesized research brief combining all sources.');
  });

  /**
   * @behavior Research Agent includes source citations with URL, title, snippet, provider
   * @business_rule Every citation must include url, title, snippet, and provider for traceability
   */
  it('includes source citations with url, title, snippet, and provider', async () => {
    const result = await agent.execute({ query: 'TypeScript best practices 2026', synthesize: false });

    for (const citation of result.citations) {
      expect(citation).toHaveProperty('url');
      expect(citation).toHaveProperty('title');
      expect(citation).toHaveProperty('snippet');
      expect(citation).toHaveProperty('provider');
      expect(typeof citation.url).toBe('string');
      expect(typeof citation.title).toBe('string');
      expect(typeof citation.snippet).toBe('string');
      expect(typeof citation.provider).toBe('string');
    }
  });

  /**
   * @behavior Research Agent skips unavailable providers and warns in brief
   * @business_rule Failed providers must not block results from successful providers; warnings must be recorded
   */
  it('skips unavailable providers and warns in brief', async () => {
    const failingProvider = createMockProvider('perplexity', [], true);

    agent = new ResearchAgent({
      providers: [failingProvider, openaiProvider],
      synthesizer
    });

    const result = await agent.execute({ query: 'TypeScript best practices 2026', synthesize: false });

    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].provider).toBe('openai');
    expect(result.warnings).toContainEqual(
      expect.stringContaining('perplexity')
    );
  });

  /**
   * @behavior Research Agent returns complete ResearchBrief for orchestrator persistence
   * @business_rule The research brief output must contain all fields needed for downstream storage
   */
  it('returns complete ResearchBrief for orchestrator persistence', async () => {
    const result = await agent.execute({ query: 'TypeScript best practices 2026', synthesize: true });

    expect(result.query).toBe('TypeScript best practices 2026');
    expect(result.brief).toBe('Synthesized research brief combining all sources.');
    expect(result.citations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: 'perplexity' })
      ])
    );
    expect(result.warnings).toEqual([]);
  });

  /**
   * @behavior Research Agent integrates as pipeline step: output feeds SEO Writer input
   * @business_rule Output must conform to Agent interface and include citations for downstream agents
   */
  it('integrates as pipeline step: output feeds SEO Writer input', async () => {
    expect(agent.type).toBe(AgentType.RESEARCH_AGENT);

    const result = await agent.execute({ query: 'TypeScript best practices 2026', synthesize: true });

    // Output must have the shape expected by downstream agents
    expect(result).toHaveProperty('query');
    expect(result).toHaveProperty('citations');
    expect(result).toHaveProperty('brief');
    expect(result).toHaveProperty('warnings');
    expect(result.query).toBe('TypeScript best practices 2026');

    // Validate method must work
    const validResult = agent.validate({ providers: ['perplexity'] });
    expect(validResult.valid).toBe(true);

    const invalidResult = agent.validate({});
    expect(invalidResult.valid).toBe(false);
  });
});
