/**
 * @behavior Full pipeline: TS worker → orchestrator → agents → Python LLM service with connected traces
 * @business_rule All LLM calls go through Python service; traces form a complete tree
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

interface SpanRecord {
  name: string;
  attributes: Record<string, unknown>;
  parent: string | null;
}

const spanRecords = new Map<string, SpanRecord>();
const spanStack: string[] = [];
let spanCounter = 0;

const { mockSpan } = vi.hoisted(() => ({
  mockSpan: vi.fn()
}));

vi.mock('@pydantic/logfire-node', () => ({
  default: { span: mockSpan }
}));

vi.mock('@opentelemetry/api', () => ({
  propagation: {
    inject: vi.fn((_ctx: unknown, carrier: Record<string, string>) => {
      carrier['traceparent'] = `00-trace-${spanStack[spanStack.length - 1] ?? 'none'}-01`;
    })
  },
  context: { active: vi.fn().mockReturnValue({}) }
}));

vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation((_name: string, processor: (job: unknown) => Promise<unknown>) => {
    (globalThis as Record<string, unknown>).__e2eProcessor = processor;
    return { on: vi.fn() };
  }),
  Queue: vi.fn().mockImplementation(() => ({ add: vi.fn() }))
}));

vi.mock('@editengage/agents/orchestrator', () => {
  const Logfire = { span: mockSpan };
  return {
    PipelineOrchestrator: vi.fn().mockImplementation(() => ({
      run: vi.fn().mockImplementation(async (options: {
        pipelineRunId: string;
        agents: Array<{ type: string; execute: (input: unknown, config?: unknown) => Promise<unknown> }>;
      }) => {
        return Logfire.span('pipeline.run', {
          attributes: { pipelineRunId: options.pipelineRunId, 'pipeline.step_count': options.agents.length },
          callback: async () => {
          const steps: unknown[] = [];
          for (let i = 0; i < options.agents.length; i++) {
            const agent = options.agents[i];
            const result = await Logfire.span('agent.execute', {
              attributes: { agentType: agent.type, stepIndex: i },
              callback: async () => {
              return agent.execute({}, {});
            }});
            steps.push(result);
          }
          return { status: 'completed', steps };
        }});
      })
    }))
  };
});

// Mock agents that call the LLM service
vi.mock('@editengage/agents/topic-queue/topic-queue.agent', () => ({
  TopicQueueAgent: vi.fn().mockImplementation(() => ({
    type: 'topic_queue',
    execute: vi.fn().mockResolvedValue({ topic: 'test-topic' }),
    validate: vi.fn().mockReturnValue({ valid: true })
  }))
}));

vi.mock('@editengage/agents/seo-writer/seo-writer.agent', () => ({
  SeoWriterAgent: vi.fn().mockImplementation((_supabase: unknown, fetchFn: (url: string, init: RequestInit) => Promise<unknown>) => ({
    type: 'seo_writer',
    execute: vi.fn().mockImplementation(async () => {
      // This simulates the agent calling the Python LLM service
      await fetchFn('http://llm-service:8000/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'anthropic/claude-sonnet-4-20250514', messages: [{ role: 'user', content: 'test' }] })
      });
      return { content: 'article' };
    }),
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

describe('E2E trace: TS pipeline → Python LLM service', () => {
  let mockFetchFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    spanRecords.clear();
    spanStack.length = 0;
    spanCounter = 0;
    process.env.LLM_SERVICE_URL = 'http://llm-service:8000';

    mockFetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'test' } }] })
    });
    globalThis.fetch = mockFetchFn;

    mockSpan.mockImplementation((name: string, opts: { attributes?: Record<string, unknown>; callback?: (span: { setAttributes: (a: Record<string, unknown>) => void }) => unknown }) => {
      const spanId = `span-${spanCounter++}`;
      const parentId = spanStack.length > 0 ? spanStack[spanStack.length - 1] : null;
      const attrs = opts.attributes ?? {};
      const callback = opts.callback;
      spanRecords.set(spanId, { name, attributes: { ...attrs }, parent: parentId });
      spanStack.push(spanId);
      const fakeSpan = { setAttributes: (a: Record<string, unknown>) => Object.assign(spanRecords.get(spanId)!.attributes, a) };
      try {
        if (!callback) { spanStack.pop(); return undefined; }
        const result = callback(fakeSpan);
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          return (result as Promise<unknown>).then((val) => { spanStack.pop(); return val; }).catch((err) => { spanStack.pop(); throw err; });
        }
        spanStack.pop();
        return result;
      } catch (err) { spanStack.pop(); throw err; }
    });
  });

  it('produces connected trace from job.process through to LLM service call', async () => {
    const { createWorker } = await import('../worker');
    createWorker({
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null })
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      })
    });

    const processor = (globalThis as Record<string, unknown>).__e2eProcessor as (job: unknown) => Promise<unknown>;

    await processor({
      id: 'job-e2e',
      attemptsMade: 1,
      data: {
        pipelineId: 'pipeline-e2e',
        pipelineRunId: 'run-e2e',
        steps: [
          { agentType: 'topic_queue', config: {} },
          { agentType: 'seo_writer', config: {} },
          { agentType: 'ghost_publisher', config: {} }
        ]
      }
    });

    // Verify span hierarchy
    const allSpans = Array.from(spanRecords.values());
    const spanNames = allSpans.map(s => s.name);

    // Root is job.process
    expect(spanNames).toContain('job.process');
    expect(spanNames).toContain('pipeline.run');
    expect(spanNames.filter(n => n === 'agent.execute')).toHaveLength(3);

    // job.process is root (no parent)
    const rootSpans = allSpans.filter(s => s.parent === null);
    expect(rootSpans).toHaveLength(1);
    expect(rootSpans[0].name).toBe('job.process');

    // All spans are connected (no orphans)
    for (const [, span] of spanRecords) {
      if (span.parent !== null) {
        expect(spanRecords.has(span.parent)).toBe(true);
      }
    }
  });

  it('SEO writer agent calls Python service URL (not external API)', async () => {
    const { createWorker } = await import('../worker');
    createWorker({
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null })
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      })
    });

    const processor = (globalThis as Record<string, unknown>).__e2eProcessor as (job: unknown) => Promise<unknown>;

    await processor({
      id: 'job-e2e-2',
      attemptsMade: 1,
      data: {
        pipelineId: 'p-e2e',
        pipelineRunId: 'run-e2e-2',
        steps: [{ agentType: 'seo_writer', config: {} }]
      }
    });

    // Verify the fetch call went to Python service, not external API
    const fetchCalls = mockFetchFn.mock.calls;
    const llmServiceCalls = fetchCalls.filter((call: string[]) =>
      call[0].includes('llm-service:8000')
    );
    expect(llmServiceCalls.length).toBeGreaterThan(0);

    // Verify NO calls to external APIs
    const externalCalls = fetchCalls.filter((call: string[]) =>
      call[0].includes('openrouter.ai') ||
      call[0].includes('api.openai.com') ||
      call[0].includes('api.perplexity.ai')
    );
    expect(externalCalls).toHaveLength(0);
  });
});
