import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mocks
const {
  mockQueueAdd,
  mockWorkerOn,
  mockOrchestratorRun,
  mockLogfireSpan,
  MockTopicQueueAgent
} = vi.hoisted(() => ({
  mockQueueAdd: vi.fn(),
  mockWorkerOn: vi.fn(),
  mockOrchestratorRun: vi.fn(),
  mockLogfireSpan: vi.fn(),
  MockTopicQueueAgent: vi.fn()
}));

let capturedWorkerProcessor: ((job: unknown) => Promise<unknown>) | null = null;

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: mockQueueAdd
  })),
  Worker: vi.fn().mockImplementation((_name: string, processor: (job: unknown) => Promise<unknown>) => {
    capturedWorkerProcessor = processor;
    return { on: mockWorkerOn };
  })
}));

vi.mock('@editengage/agents/orchestrator', () => ({
  PipelineOrchestrator: vi.fn().mockImplementation(() => ({
    run: mockOrchestratorRun
  }))
}));

vi.mock('@editengage/agents/topic-queue/topic-queue.agent', () => ({
  TopicQueueAgent: MockTopicQueueAgent
}));
vi.mock('@editengage/agents/variety-engine/variety-engine.agent', () => ({
  VarietyEngineAgent: vi.fn()
}));
vi.mock('@editengage/agents/seo-writer/seo-writer.agent', () => ({
  SeoWriterAgent: vi.fn()
}));
vi.mock('@editengage/agents/ghost-publisher/ghost-publisher.agent', () => ({
  GhostPublisherAgent: vi.fn()
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

vi.mock('@pydantic/logfire-node', () => ({
  default: {
    span: mockLogfireSpan
  }
}));
vi.mock('@editengage/agents/research/providers/traceparent', () => ({
  injectTraceHeaders: vi.fn()
}));

import { createWorker } from '../worker';
import type { PipelineJobData } from '../worker';

function createMockSupabase() {
  const eqFn = vi.fn().mockResolvedValue({ data: null, error: null });
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  const selectEqFn = vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: null }) });
  const selectFn = vi.fn().mockReturnValue({ eq: selectEqFn });
  return {
    instance: { from: vi.fn().mockReturnValue({ update: updateFn, select: selectFn }) },
    updateFn,
    eqFn
  };
}

describe('Worker tracing with Logfire', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedWorkerProcessor = null;
  });

  it('creates a job.process span with job id, queue name, and attempt number', async () => {
    const { instance } = createMockSupabase();
    mockOrchestratorRun.mockResolvedValue({ status: 'completed', steps: [] });
    MockTopicQueueAgent.mockImplementation(() => ({
      type: 'topic_queue',
      execute: vi.fn(),
      validate: vi.fn()
    }));

    // Make mockLogfireSpan execute the callback and return its result
    mockLogfireSpan.mockImplementation(
      (_msg: string, opts: { callback?: (span: unknown) => unknown }) => {
        const fakeSpan = { setAttributes: vi.fn() };
        if (opts?.callback) return opts.callback(fakeSpan);
      }
    );

    createWorker(instance);

    const mockJob: { data: PipelineJobData; id: string; attemptsMade: number } = {
      id: 'job-42',
      attemptsMade: 2,
      data: {
        pipelineId: 'pipeline-1',
        pipelineRunId: 'run-1',
        steps: [{ agentType: 'topic_queue', config: {} }]
      }
    };

    await capturedWorkerProcessor!(mockJob);

    expect(mockLogfireSpan).toHaveBeenCalledWith(
      'job.process',
      expect.objectContaining({
        attributes: {
          'job.id': 'job-42',
          'job.queue': 'editengage-pipeline',
          'job.attempt': 2
        },
        callback: expect.any(Function)
      })
    );
  });

  it('sets job.status to completed on successful job processing', async () => {
    const { instance } = createMockSupabase();
    mockOrchestratorRun.mockResolvedValue({ status: 'completed', steps: [] });
    MockTopicQueueAgent.mockImplementation(() => ({
      type: 'topic_queue',
      execute: vi.fn(),
      validate: vi.fn()
    }));

    const fakeSpan = { setAttributes: vi.fn() };
    mockLogfireSpan.mockImplementation(
      (_msg: string, opts: { callback?: (span: unknown) => unknown }) => {
        if (opts?.callback) return opts.callback(fakeSpan);
      }
    );

    createWorker(instance);

    const mockJob = {
      id: 'job-43',
      attemptsMade: 1,
      data: {
        pipelineId: 'pipeline-1',
        pipelineRunId: 'run-1',
        steps: [{ agentType: 'topic_queue', config: {} }]
      }
    };

    await capturedWorkerProcessor!(mockJob);

    expect(fakeSpan.setAttributes).toHaveBeenCalledWith({
      'job.status': 'completed'
    });
  });

  it('sets job.status to failed with error flag when job processing fails', async () => {
    const { instance } = createMockSupabase();
    mockOrchestratorRun.mockRejectedValue(new Error('Pipeline boom'));
    MockTopicQueueAgent.mockImplementation(() => ({
      type: 'topic_queue',
      execute: vi.fn(),
      validate: vi.fn()
    }));

    const fakeSpan = { setAttributes: vi.fn() };
    mockLogfireSpan.mockImplementation(
      (_msg: string, opts: { callback?: (span: unknown) => unknown }) => {
        if (opts?.callback) return opts.callback(fakeSpan);
      }
    );

    createWorker(instance);

    const mockJob = {
      id: 'job-44',
      attemptsMade: 1,
      data: {
        pipelineId: 'pipeline-1',
        pipelineRunId: 'run-1',
        steps: [{ agentType: 'topic_queue', config: {} }]
      }
    };

    await expect(capturedWorkerProcessor!(mockJob)).rejects.toThrow('Pipeline boom');

    expect(fakeSpan.setAttributes).toHaveBeenCalledWith({
      'job.status': 'failed',
      error: true
    });
  });

  it('defaults job.id to unknown and attempt to 1 when not present on job', async () => {
    const { instance } = createMockSupabase();
    mockOrchestratorRun.mockResolvedValue({ status: 'completed', steps: [] });

    mockLogfireSpan.mockImplementation(
      (_msg: string, opts: { callback?: (span: unknown) => unknown }) => {
        const fakeSpan = { setAttributes: vi.fn() };
        if (opts?.callback) return opts.callback(fakeSpan);
      }
    );

    createWorker(instance);

    // Job without id or attemptsMade
    const mockJob = {
      data: {
        pipelineId: 'pipeline-1',
        pipelineRunId: 'run-1',
        steps: []
      }
    };

    await capturedWorkerProcessor!(mockJob);

    expect(mockLogfireSpan).toHaveBeenCalledWith(
      'job.process',
      expect.objectContaining({
        attributes: {
          'job.id': 'unknown',
          'job.queue': 'editengage-pipeline',
          'job.attempt': 1
        },
        callback: expect.any(Function)
      })
    );
  });
});
