import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TopicQueueAgent } from './topic-queue.agent.js';
import { AgentType, type TopicRow } from '../types.js';

function createMockSupabase(options: {
  selectData?: TopicRow[];
  selectError?: { message: string } | null;
  updateError?: { message: string } | null;
} = {}) {
  const { selectData = [], selectError = null, updateError = null } = options;

  const updateChain = {
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: updateError })
    })
  };

  const selectChain = {
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: selectData, error: selectError })
  };

  const fromMock = vi.fn().mockImplementation((_table: string) => ({
    select: vi.fn().mockReturnValue(selectChain),
    update: vi.fn().mockReturnValue(updateChain)
  }));

  return { from: fromMock, _selectChain: selectChain, _updateChain: updateChain };
}

describe('TopicQueueAgent', () => {
  let agent: TopicQueueAgent;

  const pendingTopics: TopicRow[] = [
    {
      id: 'topic-1',
      project_id: 'proj-1',
      pipeline_id: null,
      title: 'Advanced TypeScript Patterns',
      keywords: ['typescript', 'patterns', 'advanced'],
      seo_score: 85,
      status: 'pending',
      notes: null,
      completed_at: null,
      content_id: null,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 'topic-2',
      project_id: 'proj-1',
      pipeline_id: null,
      title: 'Getting Started with React',
      keywords: ['react', 'beginner', 'tutorial'],
      seo_score: 92,
      status: 'pending',
      notes: null,
      completed_at: null,
      content_id: null,
      created_at: '2025-01-02T00:00:00Z'
    },
    {
      id: 'topic-3',
      project_id: 'proj-1',
      pipeline_id: null,
      title: 'Node.js Performance Tips',
      keywords: ['nodejs', 'performance'],
      seo_score: 78,
      status: 'pending',
      notes: null,
      completed_at: null,
      content_id: null,
      created_at: '2024-12-15T00:00:00Z'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selects highest SEO score topic when strategy is "highest_seo_score"', async () => {
    const sortedByScore = [...pendingTopics].sort((a, b) => (b.seo_score ?? 0) - (a.seo_score ?? 0));
    const supabase = createMockSupabase({ selectData: [sortedByScore[0]] });
    agent = new TopicQueueAgent(supabase as never);

    const result = await agent.execute({ projectId: 'proj-1' });

    expect(result.topic.id).toBe('topic-2');
    expect(result.topic.seo_score).toBe(92);
    expect(result.keywords).toEqual(['react', 'beginner', 'tutorial']);

    const selectChain = supabase._selectChain;
    expect(selectChain.eq).toHaveBeenCalledWith('project_id', 'proj-1');
    expect(selectChain.eq).toHaveBeenCalledWith('status', 'pending');
    expect(selectChain.order).toHaveBeenCalledWith('seo_score', { ascending: false });
    expect(selectChain.limit).toHaveBeenCalledWith(1);
  });

  it('selects oldest pending topic when strategy is "fifo"', async () => {
    const sortedByDate = [...pendingTopics].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const supabase = createMockSupabase({ selectData: [sortedByDate[0]] });
    agent = new TopicQueueAgent(supabase as never);

    const result = await agent.execute({ projectId: 'proj-1' }, { projectId: 'proj-1', strategy: 'fifo' });

    expect(result.topic.id).toBe('topic-3');
    expect(result.topic.created_at).toBe('2024-12-15T00:00:00Z');

    const selectChain = supabase._selectChain;
    expect(selectChain.order).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('marks selected topic as "in_progress"', async () => {
    const supabase = createMockSupabase({ selectData: [pendingTopics[0]] });
    agent = new TopicQueueAgent(supabase as never);

    await agent.execute({ projectId: 'proj-1' });

    const fromCalls = supabase.from.mock.calls;
    const updateCall = fromCalls.find(
      (call: string[]) => call[0] === 'topic_queue'
    );
    expect(updateCall).toBeDefined();

    const updateChain = supabase._updateChain;
    expect(updateChain.eq).toHaveBeenCalledWith('id', 'topic-1');
  });

  it('returns error when no pending topics exist', async () => {
    const supabase = createMockSupabase({ selectData: [] });
    agent = new TopicQueueAgent(supabase as never);

    await expect(agent.execute({ projectId: 'proj-1' })).rejects.toThrow(
      'No pending topics found for project proj-1'
    );
  });

  it('validates config requires a valid strategy', () => {
    const supabase = createMockSupabase();
    agent = new TopicQueueAgent(supabase as never);

    const validHighest = agent.validate({ projectId: 'proj-1', strategy: 'highest_seo_score' });
    expect(validHighest.valid).toBe(true);

    const validFifo = agent.validate({ projectId: 'proj-1', strategy: 'fifo' });
    expect(validFifo.valid).toBe(true);

    const invalidStrategy = agent.validate({ projectId: 'proj-1', strategy: 'random' });
    expect(invalidStrategy.valid).toBe(false);
    expect(invalidStrategy.errors).toContain('strategy must be "highest_seo_score" or "fifo"');

    const missingStrategy = agent.validate({ projectId: 'proj-1' });
    expect(missingStrategy.valid).toBe(false);
    expect(missingStrategy.errors).toContain('strategy must be "highest_seo_score" or "fifo"');
  });
});
