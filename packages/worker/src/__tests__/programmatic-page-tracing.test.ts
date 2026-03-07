/**
 * @behavior programmatic_page agent's llmFn injects W3C traceparent and creates Logfire span
 * @business_rule All LLM calls must propagate distributed traces for end-to-end observability
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockLogfireSpan,
  mockInjectTraceHeaders,
  MockProgrammaticPageAgent
} = vi.hoisted(() => ({
  mockLogfireSpan: vi.fn(),
  mockInjectTraceHeaders: vi.fn(),
  MockProgrammaticPageAgent: vi.fn()
}));

vi.mock('@pydantic/logfire-node', () => ({
  default: { span: mockLogfireSpan }
}));

vi.mock('@editengage/agents/research/providers/traceparent', () => ({
  injectTraceHeaders: mockInjectTraceHeaders
}));

vi.mock('@opentelemetry/api', () => ({
  propagation: {
    inject: vi.fn((_ctx: unknown, carrier: Record<string, string>) => {
      carrier['traceparent'] = '00-mock-trace-01';
    })
  },
  context: { active: vi.fn().mockReturnValue({}) }
}));

// Mock all agent modules to isolate programmatic_page testing
vi.mock('@editengage/agents/topic-queue/topic-queue.agent', () => ({ TopicQueueAgent: vi.fn() }));
vi.mock('@editengage/agents/variety-engine/variety-engine.agent', () => ({ VarietyEngineAgent: vi.fn() }));
vi.mock('@editengage/agents/seo-writer/seo-writer.agent', () => ({ SeoWriterAgent: vi.fn() }));
vi.mock('@editengage/agents/ghost-publisher/ghost-publisher.agent', () => ({ GhostPublisherAgent: vi.fn() }));
vi.mock('@editengage/agents/postbridge-publisher/postbridge-publisher.agent', () => ({ PostBridgePublisherAgent: vi.fn() }));
vi.mock('@editengage/agents/email-publisher/email-publisher.agent', () => ({ EmailPublisherAgent: vi.fn() }));
vi.mock('@editengage/agents/research/research.agent', () => ({ ResearchAgent: vi.fn() }));
vi.mock('@editengage/agents/orchestrator', () => ({
  PipelineOrchestrator: vi.fn().mockImplementation(() => ({ run: vi.fn() }))
}));

vi.mock('@editengage/agents/programmatic-page/programmatic-page.agent', () => ({
  ProgrammaticPageAgent: MockProgrammaticPageAgent
}));

import { createAgentFromStep } from '../worker';

describe('programmatic_page llmFn tracing', () => {
  let capturedLlmFn: (prompt: string) => Promise<string>;
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Capture the llmFn passed to ProgrammaticPageAgent constructor
    MockProgrammaticPageAgent.mockImplementation((llmFn: (prompt: string) => Promise<string>) => {
      capturedLlmFn = llmFn;
      return { type: 'programmatic_page', execute: vi.fn(), validate: vi.fn() };
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Generated content' } }] })
    });

    // Make Logfire.span execute the callback and return its result
    mockLogfireSpan.mockImplementation(
      (_name: string, _attrs: Record<string, unknown>, callback: (span: { setAttributes: ReturnType<typeof vi.fn> }) => unknown) => {
        const fakeSpan = { setAttributes: vi.fn() };
        return callback(fakeSpan);
      }
    );
  });

  it('injects traceparent header when calling the LLM service', async () => {
    createAgentFromStep(
      { agentType: 'programmatic_page', config: {} },
      { supabase: { from: vi.fn() } as never, fetchFn: mockFetch }
    );

    await capturedLlmFn('Write an article about testing');

    // The llmFn should call injectTraceHeaders to add traceparent to outgoing request
    expect(mockInjectTraceHeaders).toHaveBeenCalledWith(
      expect.objectContaining({ 'Content-Type': 'application/json' })
    );
  });

  it('creates a Logfire span with llm.provider, llm.model, and llm.prompt_length attributes', async () => {
    createAgentFromStep(
      { agentType: 'programmatic_page', config: {} },
      { supabase: { from: vi.fn() } as never, fetchFn: mockFetch }
    );

    const prompt = 'Write an article about testing';
    await capturedLlmFn(prompt);

    expect(mockLogfireSpan).toHaveBeenCalledWith(
      'llm.call',
      {
        'llm.provider': 'openrouter',
        'llm.model': 'anthropic/claude-sonnet-4-20250514',
        'llm.prompt_length': prompt.length
      },
      expect.any(Function)
    );
  });

  it('sets llm.response_status on the span after receiving response', async () => {
    const fakeSpan = { setAttributes: vi.fn() };
    mockLogfireSpan.mockImplementation(
      (_name: string, _attrs: Record<string, unknown>, callback: (span: { setAttributes: ReturnType<typeof vi.fn> }) => unknown) => {
        return callback(fakeSpan);
      }
    );

    createAgentFromStep(
      { agentType: 'programmatic_page', config: {} },
      { supabase: { from: vi.fn() } as never, fetchFn: mockFetch }
    );

    await capturedLlmFn('Write something');

    expect(fakeSpan.setAttributes).toHaveBeenCalledWith({
      'llm.response_status': 'ok'
    });
  });

  it('sets llm.response_status to error when response is not ok', async () => {
    const fakeSpan = { setAttributes: vi.fn() };
    mockLogfireSpan.mockImplementation(
      (_name: string, _attrs: Record<string, unknown>, callback: (span: { setAttributes: ReturnType<typeof vi.fn> }) => unknown) => {
        return callback(fakeSpan);
      }
    );

    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ choices: [{ message: { content: '' } }] })
    });

    createAgentFromStep(
      { agentType: 'programmatic_page', config: {} },
      { supabase: { from: vi.fn() } as never, fetchFn: mockFetch }
    );

    await capturedLlmFn('Write something');

    expect(fakeSpan.setAttributes).toHaveBeenCalledWith({
      'llm.response_status': 'error'
    });
  });
});
