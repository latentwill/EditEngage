/**
 * @behavior End-to-end trace hierarchy: job.process → pipeline.run → agent.execute → llm.call
 * @business_rule Pipeline traces form a connected tree queryable in Logfire
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

interface SpanRecord {
  name: string;
  attributes: Record<string, unknown>;
  parent: string | null;
  children: string[];
}

// Track span nesting via a stack
const spanStack: string[] = [];
const spanRecords = new Map<string, SpanRecord>();
let spanCounter = 0;

const mockSetAttributes = vi.fn();

const { mockSpan } = vi.hoisted(() => ({
  mockSpan: vi.fn()
}));

vi.mock('@pydantic/logfire-node', () => ({
  default: {
    span: mockSpan
  }
}));

vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation((_name: string, processor: (job: unknown) => Promise<unknown>) => {
    // Store processor for later invocation
    (globalThis as Record<string, unknown>).__testProcessor = processor;
    return { on: vi.fn() };
  }),
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn()
  }))
}));

vi.mock('@editengage/agents/orchestrator', () => {
  const Logfire = { span: mockSpan };
  return {
    PipelineOrchestrator: vi.fn().mockImplementation(() => ({
      run: vi.fn().mockImplementation(async (options: { pipelineRunId: string; agents: Array<{ type: string; execute: () => Promise<unknown> }>; initialInput: unknown }) => {
        return Logfire.span('pipeline.run', {
          pipelineRunId: options.pipelineRunId,
          'pipeline.step_count': options.agents.length
        }, async () => {
          const steps: unknown[] = [];
          for (let i = 0; i < options.agents.length; i++) {
            const agent = options.agents[i];
            const result = await Logfire.span('agent.execute', {
              agentType: agent.type,
              stepIndex: i
            }, async (span: { setAttributes: typeof mockSetAttributes }) => {
              const output = await agent.execute({});
              span.setAttributes({ 'agent.output_size': JSON.stringify(output).length });
              return output;
            });
            steps.push(result);
          }
          return { status: 'completed', steps };
        });
      })
    }))
  };
});

vi.mock('@editengage/agents/topic-queue/topic-queue.agent', () => ({
  TopicQueueAgent: vi.fn().mockImplementation(() => ({
    type: 'topic_queue',
    execute: vi.fn().mockResolvedValue({ topic: 'test-topic' }),
    validate: vi.fn().mockReturnValue({ valid: true })
  }))
}));

vi.mock('@editengage/agents/seo-writer/seo-writer.agent', () => ({
  SeoWriterAgent: vi.fn().mockImplementation(() => ({
    type: 'seo_writer',
    execute: vi.fn().mockResolvedValue({ content: 'test-article' }),
    validate: vi.fn().mockReturnValue({ valid: true })
  }))
}));

vi.mock('@editengage/agents/ghost-publisher/ghost-publisher.agent', () => ({
  GhostPublisherAgent: vi.fn().mockImplementation(() => ({
    type: 'ghost_publisher',
    execute: vi.fn().mockResolvedValue({ published: true }),
    validate: vi.fn().mockReturnValue({ valid: true })
  }))
}));

vi.mock('@editengage/agents/variety-engine/variety-engine.agent', () => ({
  VarietyEngineAgent: vi.fn()
}));
vi.mock('@editengage/agents/postbridge-publisher/postbridge-publisher.agent', () => ({
  PostBridgePublisherAgent: vi.fn()
}));
vi.mock('@editengage/agents/email-publisher/email-publisher.agent', () => ({
  EmailPublisherAgent: vi.fn()
}));
vi.mock('@editengage/agents/research/research.agent', () => ({
  ResearchAgent: vi.fn()
}));
vi.mock('@editengage/agents/programmatic-page/programmatic-page.agent', () => ({
  ProgrammaticPageAgent: vi.fn()
}));

vi.mock('../queue', () => ({
  createQueue: vi.fn(() => ({ add: vi.fn() }))
}));
vi.mock('@editengage/agents/research/providers/traceparent', () => ({
  injectTraceHeaders: vi.fn()
}));

describe('Trace hierarchy integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    spanStack.length = 0;
    spanRecords.clear();
    spanCounter = 0;

    mockSpan.mockImplementation((name: string, attrs: Record<string, unknown>, callback: (span: { setAttributes: typeof mockSetAttributes }) => unknown) => {
      const spanId = `span-${spanCounter++}`;
      const parentId = spanStack.length > 0 ? spanStack[spanStack.length - 1] : null;

      const record: SpanRecord = {
        name,
        attributes: { ...attrs },
        parent: parentId,
        children: []
      };
      spanRecords.set(spanId, record);

      if (parentId) {
        spanRecords.get(parentId)!.children.push(spanId);
      }

      spanStack.push(spanId);
      const fakeSpan = {
        setAttributes: (a: Record<string, unknown>) => {
          Object.assign(record.attributes, a);
        }
      };

      try {
        const result = callback(fakeSpan);
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          return (result as Promise<unknown>).then((val) => {
            spanStack.pop();
            return val;
          }).catch((err) => {
            spanStack.pop();
            throw err;
          });
        }
        spanStack.pop();
        return result;
      } catch (err) {
        spanStack.pop();
        throw err;
      }
    });
  });

  it('produces job.process → pipeline.run → agent.execute span hierarchy', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      })
    };

    // Import worker module which creates a BullMQ Worker
    const { createWorker } = await import('../worker');
    createWorker(mockSupabase);

    // Get the stored processor
    const processor = (globalThis as Record<string, unknown>).__testProcessor as (job: unknown) => Promise<unknown>;

    const mockJob = {
      id: 'job-123',
      attemptsMade: 1,
      data: {
        pipelineId: 'pipeline-1',
        pipelineRunId: 'run-1',
        steps: [
          { agentType: 'topic_queue', config: {} },
          { agentType: 'seo_writer', config: {} },
          { agentType: 'ghost_publisher', config: {} }
        ]
      }
    };

    await processor(mockJob);

    // Verify span names created
    const allSpans = Array.from(spanRecords.values());
    const spanNames = allSpans.map(s => s.name);

    expect(spanNames).toContain('job.process');
    expect(spanNames).toContain('pipeline.run');
    expect(spanNames.filter(n => n === 'agent.execute')).toHaveLength(3);

    // Verify hierarchy: job.process is root
    const jobSpan = allSpans.find(s => s.name === 'job.process')!;
    expect(jobSpan.parent).toBeNull();

    // pipeline.run is child of job.process
    const pipelineSpanId = Array.from(spanRecords.entries())
      .find(([, s]) => s.name === 'pipeline.run')![0];
    const pipelineSpan = spanRecords.get(pipelineSpanId)!;
    const jobSpanId = Array.from(spanRecords.entries())
      .find(([, s]) => s.name === 'job.process')![0];
    expect(pipelineSpan.parent).toBe(jobSpanId);

    // agent.execute spans are children of pipeline.run
    const agentSpans = Array.from(spanRecords.entries())
      .filter(([, s]) => s.name === 'agent.execute');
    for (const [, span] of agentSpans) {
      expect(span.parent).toBe(pipelineSpanId);
    }
  });

  it('job.process span has correct attributes', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      })
    };

    const { createWorker } = await import('../worker');
    createWorker(mockSupabase);

    const processor = (globalThis as Record<string, unknown>).__testProcessor as (job: unknown) => Promise<unknown>;

    await processor({
      id: 'job-456',
      attemptsMade: 2,
      data: {
        pipelineId: 'p-1',
        pipelineRunId: 'run-2',
        steps: [{ agentType: 'topic_queue', config: {} }]
      }
    });

    const jobSpan = Array.from(spanRecords.values()).find(s => s.name === 'job.process')!;
    expect(jobSpan.attributes['job.id']).toBe('job-456');
    expect(jobSpan.attributes['job.queue']).toBe('editengage-pipeline');
    expect(jobSpan.attributes['job.attempt']).toBe(2);
    expect(jobSpan.attributes['job.status']).toBe('completed');
  });

  it('no orphan spans — every non-root span has a parent', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      })
    };

    const { createWorker } = await import('../worker');
    createWorker(mockSupabase);

    const processor = (globalThis as Record<string, unknown>).__testProcessor as (job: unknown) => Promise<unknown>;

    await processor({
      id: 'job-789',
      attemptsMade: 1,
      data: {
        pipelineId: 'p-1',
        pipelineRunId: 'run-3',
        steps: [
          { agentType: 'topic_queue', config: {} },
          { agentType: 'seo_writer', config: {} }
        ]
      }
    });

    const allSpans = Array.from(spanRecords.values());
    const roots = allSpans.filter(s => s.parent === null);
    const nonRoots = allSpans.filter(s => s.parent !== null);

    // Exactly one root span (job.process)
    expect(roots).toHaveLength(1);
    expect(roots[0].name).toBe('job.process');

    // All non-root spans have valid parents
    for (const span of nonRoots) {
      expect(spanRecords.has(span.parent!)).toBe(true);
    }
  });
});
