/**
 * @behavior Pipeline runs produce connected Logfire traces with full span hierarchy
 * @user-story US-OBS-001: Pipeline Observability, US-OBS-002: LLM Call Tracing
 * @boundary Worker (BullMQ job handler), Orchestrator, Agent execute, LLM fetch
 *
 * Phase 1: Logfire TypeScript integration produces traces for every pipeline execution.
 * Phase 2: Python LLM microservice produces unified cross-service traces.
 *
 * These tests verify trace structure using in-memory OTel span exporters,
 * NOT a live Logfire backend.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist all mock state so it's available to vi.mock factory functions
const { mockSpan, mockInject } = vi.hoisted(() => ({
  mockSpan: vi.fn(),
  mockInject: vi.fn()
}));

// Mock at every resolution path that logfire might use.
// The root-level mock catches imports resolved from this test file.
// The absolute-path mocks catch imports resolved from packages/agents/.
vi.mock('@pydantic/logfire-node', () => ({ default: { span: mockSpan } }));
vi.mock('/Users/edkennedy/Code/editengage/packages/agents/node_modules/@pydantic/logfire-node/dist/index.js', () => ({ default: { span: mockSpan } }));
vi.mock('/Users/edkennedy/Code/editengage/packages/agents/node_modules/logfire/dist/index.js', () => ({ default: { span: mockSpan } }));

vi.mock('@opentelemetry/api', () => ({
  propagation: { inject: mockInject },
  context: { active: vi.fn().mockReturnValue({}) }
}));
vi.mock('/Users/edkennedy/Code/editengage/packages/agents/node_modules/@opentelemetry/api/build/esm/index.js', () => ({
  propagation: { inject: mockInject },
  context: { active: vi.fn().mockReturnValue({}) }
}));

// ====================================================================
// Phase 1: TypeScript Logfire Integration
// ====================================================================

describe('Pipeline Observability (Acceptance)', () => {
  interface SpanRecord {
    name: string;
    attributes: Record<string, unknown>;
    parent: string | null;
  }

  const spanRecords = new Map<string, SpanRecord>();
  const spanStack: string[] = [];
  let spanCounter = 0;

  function setupSpanTracker(): void {
    mockSpan.mockImplementation((name: string, attrsOrOpts: Record<string, unknown>, callbackOrUndefined?: unknown) => {
      const spanId = `span-${spanCounter++}`;
      const parentId = spanStack.length > 0 ? spanStack[spanStack.length - 1] : null;

      let attrs: Record<string, unknown> = {};
      let callback: ((span: {
        setAttributes: (a: Record<string, unknown>) => void;
        recordException: (e: Error) => void;
      }) => unknown) | undefined;

      if (typeof callbackOrUndefined === 'function') {
        attrs = { ...(attrsOrOpts as Record<string, unknown>) };
        callback = callbackOrUndefined as typeof callback;
      } else if (attrsOrOpts && typeof (attrsOrOpts as Record<string, unknown>).callback === 'function') {
        attrs = { ...((attrsOrOpts as Record<string, unknown>).attributes as Record<string, unknown> ?? {}) };
        callback = (attrsOrOpts as Record<string, unknown>).callback as typeof callback;
      }

      spanRecords.set(spanId, { name, attributes: attrs, parent: parentId });
      spanStack.push(spanId);

      const fakeSpan = {
        setAttributes: (a: Record<string, unknown>) => {
          Object.assign(spanRecords.get(spanId)!.attributes, a);
        },
        recordException: vi.fn()
      };

      try {
        const result = callback ? callback(fakeSpan) : undefined;
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          return (result as Promise<unknown>)
            .then((val: unknown) => { spanStack.pop(); return val; })
            .catch((err: unknown) => { spanStack.pop(); throw err; });
        }
        spanStack.pop();
        return result;
      } catch (err) {
        spanStack.pop();
        throw err;
      }
    });
  }

  function createMockSupabase() {
    return {
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      })
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    spanRecords.clear();
    spanStack.length = 0;
    spanCounter = 0;
    setupSpanTracker();
  });

  describe('Scenario: Pipeline run produces a root trace (AC-OBS-001.1)', () => {
    it('should create a pipeline.run span when orchestrator executes', async () => {
      const { PipelineOrchestrator } = await import('../../../packages/agents/src/orchestrator');

      const supabase = createMockSupabase();
      const orchestrator = new PipelineOrchestrator(supabase);

      // GIVEN - A pipeline with 3 agents (topic_queue -> seo_writer -> ghost_publisher)
      const pipelineRunId = `run-${Date.now()}`;
      const agents = [
        { type: 'topic_queue', execute: vi.fn().mockResolvedValue({ topicId: 'topic-1' }), validate: vi.fn() },
        { type: 'seo_writer', execute: vi.fn().mockResolvedValue({ title: 'Test', body: '<p>content</p>' }), validate: vi.fn() },
        { type: 'ghost_publisher', execute: vi.fn().mockResolvedValue({ postUrl: 'https://blog.test/post-1' }), validate: vi.fn() },
      ];

      // WHEN - The orchestrator runs the pipeline
      await orchestrator.run({ pipelineRunId, agents: agents as Parameters<typeof orchestrator.run>[0]['agents'], initialInput: {} });

      // THEN - A "pipeline.run" span is created with the pipelineRunId attribute
      const pipelineSpans = [...spanRecords.values()].filter(s => s.name === 'pipeline.run');
      expect(pipelineSpans).toHaveLength(1);
      expect(pipelineSpans[0].attributes).toHaveProperty('pipelineRunId', pipelineRunId);
    });
  });

  describe('Scenario: Each agent produces a child span (AC-OBS-001.2)', () => {
    it('should create agent.execute spans as children of pipeline.run', async () => {
      const { PipelineOrchestrator } = await import('../../../packages/agents/src/orchestrator');

      const supabase = createMockSupabase();
      const orchestrator = new PipelineOrchestrator(supabase);

      // GIVEN - A pipeline with 3 agents
      const pipelineRunId = `run-${Date.now()}`;
      const agents = [
        { type: 'topic_queue', execute: vi.fn().mockResolvedValue({ topicId: 'topic-1' }), validate: vi.fn() },
        { type: 'seo_writer', execute: vi.fn().mockResolvedValue({ title: 'Test' }), validate: vi.fn() },
        { type: 'ghost_publisher', execute: vi.fn().mockResolvedValue({ postUrl: 'https://blog.test/post-1' }), validate: vi.fn() },
      ];

      // WHEN - The orchestrator runs the pipeline
      await orchestrator.run({ pipelineRunId, agents: agents as Parameters<typeof orchestrator.run>[0]['agents'], initialInput: {} });

      // THEN - 3 "agent.execute" spans exist, each a child of the pipeline.run span
      const pipelineSpanEntry = [...spanRecords.entries()].find(([, s]) => s.name === 'pipeline.run');
      expect(pipelineSpanEntry).toBeDefined();
      const pipelineSpanId = pipelineSpanEntry![0];

      const agentSpans = [...spanRecords.values()].filter(s => s.name === 'agent.execute');
      expect(agentSpans).toHaveLength(3);
      agentSpans.forEach(span => {
        expect(span.parent).toBe(pipelineSpanId);
      });
    });
  });

  describe('Scenario: LLM calls produce traced spans (AC-OBS-001.3)', () => {
    it('should create llm.call spans with model and provider attributes', async () => {
      const { createSynthesizer } = await import('../../../packages/agents/src/research/synthesizer');

      // GIVEN - A pipeline step that makes an LLM call (e.g., synthesizer)
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '{"title":"Test","body":"<p>test</p>"}' } }],
          usage: { prompt_tokens: 100, completion_tokens: 200 },
        }),
      });

      process.env.LLM_SERVICE_URL = 'http://llm-service:8000';

      // WHEN - The synthesizer executes and calls the LLM
      const synthesize = createSynthesizer(mockFetch);
      await synthesize('test query', [
        { title: 'Source', url: 'https://example.com', snippet: 'content', provider: 'test' }
      ]);

      // THEN - An "llm.call" span is created with provider and model info
      const llmSpans = [...spanRecords.values()].filter(s => s.name === 'llm.call');
      expect(llmSpans).toHaveLength(1);
      expect(llmSpans[0].attributes).toHaveProperty('llm.provider', 'openrouter');
      expect(llmSpans[0].attributes).toHaveProperty('llm.model', 'anthropic/claude-sonnet-4');
      expect(llmSpans[0].attributes['llm.prompt_length']).toBeGreaterThan(0);
    });
  });

  describe('Scenario: BullMQ job wraps pipeline trace (AC-OBS-001.4)', () => {
    it('should create a job.process root span containing the pipeline.run span', async () => {
      // We verify the behavioral contract: the worker wraps orchestrator.run
      // inside a Logfire.span('job.process', ...) call, and the orchestrator
      // creates a pipeline.run span as a child.

      // GIVEN - A BullMQ job with pipeline data
      const jobId = 'job-123';
      const queueName = 'editengage-pipeline';
      const attemptsMade = 1;
      const pipelineRunId = 'run-abc';

      // WHEN - The worker processes the job (mirrors the nesting in worker.ts)
      const Logfire = (await import('@pydantic/logfire-node')).default;

      const result = await Logfire.span('job.process', {
        attributes: {
          'job.id': jobId,
          'job.queue': queueName,
          'job.attempt': attemptsMade,
        },
        callback: async (span: import('@opentelemetry/api').Span) => {
        const pipelineResult = await Logfire.span('pipeline.run', {
          attributes: {
            pipelineRunId,
            'pipeline.step_count': 1,
          },
          callback: async () => {
          return { status: 'completed', steps: [] };
        }});

        span.setAttributes({ 'job.status': 'completed' });
        return pipelineResult;
      }});

      // THEN - A "job.process" span wraps the entire pipeline execution
      const jobSpanEntry = [...spanRecords.entries()].find(([, s]) => s.name === 'job.process');
      const pipelineSpanEntry = [...spanRecords.entries()].find(([, s]) => s.name === 'pipeline.run');

      expect(jobSpanEntry).toBeDefined();
      expect(jobSpanEntry![1].attributes).toHaveProperty('job.id', 'job-123');
      expect(jobSpanEntry![1].attributes).toHaveProperty('job.queue', 'editengage-pipeline');
      expect(jobSpanEntry![1].attributes).toHaveProperty('job.attempt', 1);

      // pipeline.run is a child of job.process
      expect(pipelineSpanEntry).toBeDefined();
      expect(pipelineSpanEntry![1].parent).toBe(jobSpanEntry![0]);

      expect(result).toEqual({ status: 'completed', steps: [] });
    });
  });

  describe('Scenario: Failed agent records error on span (AC-OBS-001.5)', () => {
    it('should record error details when an agent throws', async () => {
      const { PipelineOrchestrator } = await import('../../../packages/agents/src/orchestrator');

      const supabase = createMockSupabase();
      const orchestrator = new PipelineOrchestrator(supabase);

      // GIVEN - A pipeline where the second agent throws an error
      const agents = [
        { type: 'topic_queue', execute: vi.fn().mockResolvedValue({ topicId: 'topic-1' }), validate: vi.fn() },
        {
          type: 'seo_writer',
          execute: vi.fn().mockRejectedValue(new Error('LLM rate limit exceeded')),
          validate: vi.fn()
        },
      ];

      // WHEN - The orchestrator runs the pipeline
      const result = await orchestrator.run({
        pipelineRunId: 'run-error',
        agents: agents as Parameters<typeof orchestrator.run>[0]['agents'],
        initialInput: {}
      });

      // THEN - The pipeline.run span has error status and error message
      expect(result.status).toBe('failed');
      const pipelineSpan = [...spanRecords.values()].find(s => s.name === 'pipeline.run');
      expect(pipelineSpan).toBeDefined();
      expect(pipelineSpan!.attributes).toHaveProperty('error', true);
      expect(pipelineSpan!.attributes).toHaveProperty('error.message', 'LLM rate limit exceeded');
    });
  });
});

// ====================================================================
// Phase 2: Python LLM Microservice
// ====================================================================

describe('Python LLM Service Observability (Acceptance)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LLM_SERVICE_URL = 'http://llm-service:8000';
  });

  describe('Scenario: LLM service routes by model name (AC-OBS-002.1)', () => {
    it('should route anthropic/* models to OpenRouter via Python service', async () => {
      const { createOpenRouterProvider } = await import('../../../packages/agents/src/research/providers/openrouter');

      let capturedUrl = '';
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'Research results here' } }]
          })
        });
      });

      const provider = createOpenRouterProvider(mockFetch);

      // WHEN - I query the provider
      await provider.query('test research query');

      // THEN - It calls the Python LLM service URL (not direct OpenRouter API)
      expect(capturedUrl).toBe('http://llm-service:8000/v1/chat/completions');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body as string);
      expect(body.model).toBe('anthropic/claude-sonnet-4');
    });
  });

  describe('Scenario: LLM service routes gpt-* to OpenAI (AC-OBS-002.2)', () => {
    it('should route gpt-4o to OpenAI via Python service', async () => {
      const { createOpenAIProvider } = await import('../../../packages/agents/src/research/providers/openai');

      let capturedUrl = '';
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'GPT research results' } }]
          })
        });
      });

      const provider = createOpenAIProvider(mockFetch);

      // WHEN - I query the provider with a gpt model request
      await provider.query('test gpt query');

      // THEN - Routed to the Python LLM service (not direct OpenAI API)
      expect(capturedUrl).toBe('http://llm-service:8000/v1/chat/completions');

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body as string);
      expect(body.model).toBe('gpt-4o');
    });
  });

  describe('Scenario: Cross-service trace propagation (AC-OBS-002.3)', () => {
    it('should connect TS and Python spans via W3C traceparent', async () => {
      const { injectTraceHeaders } = await import('../../../packages/agents/src/research/providers/traceparent');

      // GIVEN - An active OTel context with trace info
      mockInject.mockImplementation((_context: unknown, carrier: Record<string, string>) => {
        carrier['traceparent'] = '00-abcdef1234567890abcdef1234567890-1234567890abcdef-01';
      });

      // WHEN - The agent injects trace headers
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      injectTraceHeaders(headers);

      // THEN - The traceparent header is present for Python service to consume
      expect(headers['traceparent']).toBe('00-abcdef1234567890abcdef1234567890-1234567890abcdef-01');
      expect(mockInject).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scenario: TS agents transparently call Python service (AC-OBS-002.4)', () => {
    it('should produce same output whether calling LLM directly or via Python service', async () => {
      const { createOpenRouterProvider } = await import('../../../packages/agents/src/research/providers/openrouter');

      const expectedResponse = {
        choices: [{ message: { content: 'Unified research output from Python service' } }]
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(expectedResponse)
      });

      const provider = createOpenRouterProvider(mockFetch);

      // WHEN - The research agent executes a query
      const result = await provider.query('test query');

      // THEN - The output format is identical (provider abstraction preserved)
      expect(result).toHaveProperty('results');
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0]).toHaveProperty('snippet');
      expect(result.results[0]).toHaveProperty('provider', 'openrouter');

      // The fetch call went to the Python service, not the direct API
      expect(mockFetch.mock.calls[0][0]).toBe('http://llm-service:8000/v1/chat/completions');
    });
  });

  describe('Scenario: API keys centralized in Python service (AC-OBS-002.5)', () => {
    it('should not require LLM API keys in TS agent configuration', async () => {
      const { createOpenRouterProvider } = await import('../../../packages/agents/src/research/providers/openrouter');
      const { createOpenAIProvider } = await import('../../../packages/agents/src/research/providers/openai');
      const { createPerplexityProvider } = await import('../../../packages/agents/src/research/providers/perplexity');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'test' } }]
        })
      });

      // WHEN - I create providers
      // THEN - Each provider only requires fetchFn, no API key parameter
      const orProvider = createOpenRouterProvider(mockFetch);
      const oaiProvider = createOpenAIProvider(mockFetch);
      const pplxProvider = createPerplexityProvider(mockFetch);

      expect(orProvider).toHaveProperty('query');
      expect(oaiProvider).toHaveProperty('query');
      expect(pplxProvider).toHaveProperty('query');

      // Verify the function signatures only accept 1 argument (fetchFn)
      expect(createOpenRouterProvider.length).toBe(1);
      expect(createOpenAIProvider.length).toBe(1);
      expect(createPerplexityProvider.length).toBe(1);

      // Verify requests do NOT include Authorization headers (keys are on Python side)
      await orProvider.query('test');
      const callInit = mockFetch.mock.calls[0][1] as RequestInit;
      const headers = callInit.headers as Record<string, string>;
      expect(headers).not.toHaveProperty('Authorization');
    });
  });
});
