export enum NoveltyResult {
  NOVEL = 'NOVEL',
  OVERLAPS = 'OVERLAPS'
}

const SIMILARITY_THRESHOLD = 0.65;

/**
 * Computes Jaccard similarity between two strings based on word tokens.
 */
function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/[\s|]+/).filter(Boolean));
  const setB = new Set(b.toLowerCase().split(/[\s|]+/).filter(Boolean));

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Checks if a canonical string is novel relative to existing memory.
 */
export function checkNovelty(canonical: string, memory: string[]): NoveltyResult {
  for (const entry of memory) {
    const similarity = jaccardSimilarity(canonical, entry);
    if (similarity >= SIMILARITY_THRESHOLD) {
      return NoveltyResult.OVERLAPS;
    }
  }
  return NoveltyResult.NOVEL;
}

export { jaccardSimilarity };
