import { checkNovelty, NoveltyResult } from './novelty-checker.js';

export interface MutationResult {
  canonical: string;
  isNovel: boolean;
  attempts: number;
}

const ALTERNATIVE_ANGLES = [
  'best practices', 'pitfalls', 'comparison', 'deep dive', 'quick start',
  'advanced tips', 'real world', 'case study', 'troubleshooting', 'migration',
  'architecture', 'security', 'testing', 'monitoring', 'automation',
  'patterns', 'anti-patterns', 'benchmarks', 'tooling', 'ecosystem'
];

/**
 * Mutates the angle of a canonical string to find a novel variant.
 * Tries up to maxAttempts times, then returns the best variant found.
 */
export function mutate(
  canonical: string,
  memory: string[],
  maxAttempts: number = 5
): MutationResult {
  const parts = canonical.split('|').map(p => p.trim());
  const intent = parts[0];
  const entity = parts[1];
  const originalAngle = parts[2];

  let bestCandidate = canonical;
  let bestNovel = false;
  let attempts = 0;

  const availableAngles = ALTERNATIVE_ANGLES.filter(a => a !== originalAngle);

  for (let i = 0; i < Math.min(maxAttempts, availableAngles.length); i++) {
    attempts++;
    const candidate = `${intent} | ${entity} | ${availableAngles[i]}`;
    const novelty = checkNovelty(candidate, memory);

    if (novelty === NoveltyResult.NOVEL) {
      return { canonical: candidate, isNovel: true, attempts };
    }

    bestCandidate = candidate;
  }

  return { canonical: bestCandidate, isNovel: bestNovel, attempts };
}
