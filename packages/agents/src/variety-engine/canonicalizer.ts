/**
 * Canonicalizes a topic title into "intent | entity | angle" format.
 * Uses simple heuristic word analysis.
 */
export function canonicalize(title: string): string {
  const words = title.toLowerCase().split(/\s+/).filter(Boolean);

  const intentWords = ['how', 'to', 'why', 'what', 'when', 'guide', 'tutorial', 'tips', 'best', 'top', 'ways'];
  const stopWords = ['a', 'an', 'the', 'for', 'with', 'and', 'or', 'in', 'on', 'of', 'is', 'are'];

  const contentWords = words.filter(w => !intentWords.includes(w) && !stopWords.includes(w));

  // Intent: first action-like word or default
  const intentCandidates = words.filter(w =>
    ['optimize', 'build', 'create', 'learn', 'getting', 'started', 'improve', 'deploy',
     'setup', 'configure', 'debug', 'test', 'scale', 'manage', 'guide', 'tutorial',
     'how', 'tips', 'best', 'ways', 'use', 'implement', 'design', 'write'].includes(w)
  );
  const intent = intentCandidates[0] ?? contentWords[0] ?? 'explore';

  // Entity: the primary noun/technology (usually the most distinctive word)
  const techWords = contentWords.filter(w =>
    !['optimize', 'build', 'create', 'learn', 'getting', 'started', 'improve', 'deploy',
      'setup', 'configure', 'debug', 'test', 'scale', 'manage', 'use', 'implement',
      'design', 'write', 'large', 'small', 'fast', 'slow', 'new', 'old',
      'performance', 'speed', 'efficiency', 'apps', 'web', 'servers'].includes(w)
  );
  const entity = techWords[0] ?? contentWords[1] ?? 'topic';

  // Angle: the remaining context/perspective
  const usedWords = [intent, entity];
  const angleWords = contentWords.filter(w => !usedWords.includes(w));
  const angle = angleWords.slice(0, 2).join(' ') || 'overview';

  return `${intent} | ${entity} | ${angle}`;
}
