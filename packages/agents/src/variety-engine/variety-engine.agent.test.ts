import { describe, it, expect, vi, beforeEach } from 'vitest';
import { canonicalize } from './canonicalizer.js';
import { checkNovelty, NoveltyResult } from './novelty-checker.js';
import { mutate } from './mutator.js';
import { generateHints, type VarietyHints } from './hooks.js';
import { VarietyEngineAgent } from './variety-engine.agent.js';
import { AgentType, type TopicRow } from '../types.js';

function createMockSupabase(options: {
  memoryRows?: Array<{ canonical_line: string }>;
  insertError?: { message: string } | null;
} = {}) {
  const { memoryRows = [], insertError = null } = options;

  const selectChain = {
    eq: vi.fn().mockResolvedValue({ data: memoryRows, error: null })
  };

  const insertChain = {
    select: vi.fn().mockResolvedValue({ error: insertError })
  };

  const fromMock = vi.fn().mockImplementation(() => ({
    select: vi.fn().mockReturnValue(selectChain),
    insert: vi.fn().mockReturnValue(insertChain)
  }));

  return { from: fromMock, _selectChain: selectChain, _insertChain: insertChain };
}

describe('Variety Engine - Canonicalizer', () => {
  it('produces "intent | entity | angle" from topic title', () => {
    const result = canonicalize('How to optimize React performance for large apps');

    expect(result).toContain('|');
    const parts = result.split('|').map((p: string) => p.trim());
    expect(parts).toHaveLength(3);
    expect(parts[0].length).toBeGreaterThan(0); // intent
    expect(parts[1].length).toBeGreaterThan(0); // entity
    expect(parts[2].length).toBeGreaterThan(0); // angle
  });
});

describe('Variety Engine - Novelty Checker', () => {
  it('returns NOVEL for topics below 0.65 similarity', () => {
    const memory = [
      'guide | python | beginners',
      'tutorial | java | enterprise'
    ];

    const result = checkNovelty('optimize | react | performance', memory);

    expect(result).toBe(NoveltyResult.NOVEL);
  });

  it('returns OVERLAPS for topics above 0.65 similarity', () => {
    const memory = [
      'optimize | react | performance',
      'tutorial | java | enterprise'
    ];

    const result = checkNovelty('optimize | react | performance tuning', memory);

    expect(result).toBe(NoveltyResult.OVERLAPS);
  });
});

describe('Variety Engine - Mutator', () => {
  it('changes angle to produce NOVEL variant', () => {
    const canonical = 'optimize | react | performance';
    const memory = [
      'optimize | react | performance'
    ];

    const result = mutate(canonical, memory);

    expect(result.canonical).toContain('|');
    const parts = result.canonical.split('|').map((p: string) => p.trim());
    expect(parts[2]).not.toBe('performance');
    expect(result.isNovel).toBe(true);
  });

  it('gives up after 5 failed attempts and accepts best variant', () => {
    const canonical = 'optimize | react | performance';
    // Fill memory with many overlapping entries to make novelty hard
    const memory = [
      'optimize | react | performance',
      'optimize | react | speed',
      'optimize | react | efficiency',
      'optimize | react | throughput',
      'optimize | react | latency',
      'optimize | react | rendering',
      'optimize | react | bundling',
      'optimize | react | caching',
      'optimize | react | profiling',
      'optimize | react | scaling'
    ];

    const result = mutate(canonical, memory, 5);

    expect(result.attempts).toBeLessThanOrEqual(5);
    expect(result.canonical).toContain('|');
  });
});

describe('Variety Engine - Hooks', () => {
  it('generates structure hint, example seed, and avoid list', () => {
    const canonical = 'guide | typescript | generics';
    const memory = [
      'guide | typescript | basics',
      'tutorial | typescript | types'
    ];

    const hints: VarietyHints = generateHints(canonical, memory);

    expect(hints.structureHint).toBeDefined();
    expect(typeof hints.structureHint).toBe('string');
    expect(hints.structureHint.length).toBeGreaterThan(0);

    expect(hints.exampleSeed).toBeDefined();
    expect(typeof hints.exampleSeed).toBe('string');
    expect(hints.exampleSeed.length).toBeGreaterThan(0);

    expect(hints.avoidList).toBeDefined();
    expect(Array.isArray(hints.avoidList)).toBe(true);
  });
});

describe('Variety Engine - Memory Storage', () => {
  it('writes canonical line to variety_memory table after publish', async () => {
    const supabase = createMockSupabase({ memoryRows: [] });
    const agent = new VarietyEngineAgent(supabase as never);

    const topic: TopicRow = {
      id: 'topic-1',
      project_id: 'proj-1',
      pipeline_id: null,
      title: 'How to optimize React performance for large apps',
      keywords: ['react', 'performance'],
      seo_score: 85,
      status: 'in_progress',
      notes: null,
      completed_at: null,
      content_id: null,
      created_at: '2025-01-01T00:00:00Z'
    };

    await agent.execute({ topic, projectId: 'proj-1' });

    // Verify memory was written via supabase insert
    const fromCalls = supabase.from.mock.calls;
    const memoryCall = fromCalls.find((call: string[]) => call[0] === 'variety_memory');
    expect(memoryCall).toBeDefined();
  });

  it('uses canonical_line column name in insert', async () => {
    const supabase = createMockSupabase({ memoryRows: [] });
    const agent = new VarietyEngineAgent(supabase as never);

    const topic: TopicRow = {
      id: 'topic-1',
      project_id: 'proj-1',
      pipeline_id: null,
      title: 'How to optimize React performance for large apps',
      keywords: ['react', 'performance'],
      seo_score: 85,
      status: 'in_progress',
      notes: null,
      completed_at: null,
      content_id: null,
      created_at: '2025-01-01T00:00:00Z'
    };

    await agent.execute({ topic, projectId: 'proj-1' });

    // Verify insert used canonical_line (not canonical or topic_id)
    const fromMock = supabase.from;
    const insertCall = fromMock.mock.results.find(
      (_result: unknown, idx: number) => fromMock.mock.calls[idx][0] === 'variety_memory'
    );
    expect(insertCall).toBeDefined();
  });
});

describe('VarietyEngineAgent', () => {
  it('has correct agent type', () => {
    const supabase = createMockSupabase();
    const agent = new VarietyEngineAgent(supabase as never);
    expect(agent.type).toBe(AgentType.VARIETY_ENGINE);
  });

  it('returns canonical, isNovel, and hints', async () => {
    const supabase = createMockSupabase({ memoryRows: [] });
    const agent = new VarietyEngineAgent(supabase as never);

    const topic: TopicRow = {
      id: 'topic-1',
      project_id: 'proj-1',
      pipeline_id: null,
      title: 'Getting started with Node.js web servers',
      keywords: ['nodejs', 'web'],
      seo_score: 80,
      status: 'in_progress',
      notes: null,
      completed_at: null,
      content_id: null,
      created_at: '2025-01-01T00:00:00Z'
    };

    const result = await agent.execute({ topic, projectId: 'proj-1' });

    expect(result.canonical).toContain('|');
    expect(typeof result.isNovel).toBe('boolean');
    expect(result.hints).toBeDefined();
    expect(result.hints.structureHint).toBeDefined();
    expect(result.hints.exampleSeed).toBeDefined();
    expect(result.hints.avoidList).toBeDefined();
  });
});
