type FetchFn = (url: string, init?: RequestInit) => Promise<{ ok: boolean; status?: number; json(): Promise<unknown> }>;

interface SerpResult {
  organic: Array<{ title: string; snippet: string; wordCount: number }>;
}

export interface SerpAnalysis {
  averageWordCount: number;
  targetWordCount: number;
  results: Array<{ title: string; snippet: string; wordCount: number }>;
}

/**
 * Performs SERP research for a given query and returns analysis.
 * Target word count is 15% above the average of top results.
 */
export async function performSerpResearch(
  query: string,
  apiKey: string,
  fetchFn: FetchFn
): Promise<SerpAnalysis> {
  const response = await fetchFn(
    `https://serpapi.com/search?q=${encodeURIComponent(query)}&api_key=${apiKey}`
  );

  if (!response.ok) {
    throw new Error(`SERP API error: ${response.status ?? 'unknown'}`);
  }

  const data = await response.json() as SerpResult;
  const results = data.organic ?? [];

  const totalWords = results.reduce((sum, r) => sum + r.wordCount, 0);
  const averageWordCount = results.length > 0 ? Math.round(totalWords / results.length) : 1500;
  const targetWordCount = Math.round(averageWordCount * 1.15);

  return { averageWordCount, targetWordCount, results };
}
