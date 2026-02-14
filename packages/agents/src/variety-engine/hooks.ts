export interface VarietyHints {
  structureHint: string;
  exampleSeed: string;
  avoidList: string[];
}

const STRUCTURE_TEMPLATES: Record<string, string> = {
  guide: 'Use a step-by-step tutorial format with numbered sections',
  optimize: 'Use a problem-solution format with before/after comparisons',
  tips: 'Use a listicle format with actionable takeaways',
  tutorial: 'Use a hands-on walkthrough with code examples',
  build: 'Use a project-based approach with incremental steps',
  default: 'Use a clear introduction, detailed body sections, and actionable conclusion'
};

/**
 * Generates variety hints from a canonical analysis and memory.
 */
export function generateHints(canonical: string, memory: string[]): VarietyHints {
  const parts = canonical.split('|').map(p => p.trim());
  const intent = parts[0];
  const entity = parts[1];
  const angle = parts[2];

  const structureHint = STRUCTURE_TEMPLATES[intent] ?? STRUCTURE_TEMPLATES['default'];

  const exampleSeed = `A real-world ${entity} scenario focusing on ${angle}`;

  const avoidList = memory
    .map(entry => {
      const entryParts = entry.split('|').map(p => p.trim());
      return entryParts[2];
    })
    .filter((a): a is string => Boolean(a));

  return { structureHint, exampleSeed, avoidList };
}
