import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mocks - these are available inside vi.mock factories
const {
  mockQueueAdd,
  mockWorkerOn,
  mockOrchestratorRun,
  MockTopicQueueAgent,
  MockVarietyEngineAgent,
  MockSeoWriterAgent,
  MockGhostPublisherAgent,
  MockPostBridgePublisherAgent,
  MockEmailPublisherAgent,
  MockResearchAgent,
  MockProgrammaticPageAgent
} = vi.hoisted(() => ({
  mockQueueAdd: vi.fn(),
  mockWorkerOn: vi.fn(),
  mockOrchestratorRun: vi.fn(),
  MockTopicQueueAgent: vi.fn(),
  MockVarietyEngineAgent: vi.fn(),
  MockSeoWriterAgent: vi.fn(),
  MockGhostPublisherAgent: vi.fn(),
  MockPostBridgePublisherAgent: vi.fn(),
  MockEmailPublisherAgent: vi.fn(),
  MockResearchAgent: vi.fn(),
  MockProgrammaticPageAgent: vi.fn()
}));

let capturedWorkerProcessor: ((job: unknown) => Promise<unknown>) | null = null;

vi.mock('bullmq', () => {
  return {
    Queue: vi.fn().mockImplementation(() => ({
      add: mockQueueAdd
    })),
    Worker: vi.fn().mockImplementation((_name: string, processor: (job: unknown) => Promise<unknown>) => {
      capturedWorkerProcessor = processor;
      return {
        on: mockWorkerOn
      };
    })
  };
});

vi.mock('@editengage/agents/orchestrator', () => {
  return {
    PipelineOrchestrator: vi.fn().mockImplementation(() => ({
      run: mockOrchestratorRun
    }))
  };
});

vi.mock('@editengage/agents/topic-queue/topic-queue.agent', () => ({
  TopicQueueAgent: MockTopicQueueAgent
}));
vi.mock('@editengage/agents/variety-engine/variety-engine.agent', () => ({
  VarietyEngineAgent: MockVarietyEngineAgent
}));
vi.mock('@editengage/agents/seo-writer/seo-writer.agent', () => ({
  SeoWriterAgent: MockSeoWriterAgent
}));
vi.mock('@editengage/agents/ghost-publisher/ghost-publisher.agent', () => ({
  GhostPublisherAgent: MockGhostPublisherAgent
}));
vi.mock('@editengage/agents/postbridge-publisher/postbridge-publisher.agent', () => ({
  PostBridgePublisherAgent: MockPostBridgePublisherAgent
}));
vi.mock('@editengage/agents/email-publisher/email-publisher.agent', () => ({
  EmailPublisherAgent: MockEmailPublisherAgent
}));
vi.mock('@editengage/agents/research/research.agent', () => ({
  ResearchAgent: MockResearchAgent
}));
vi.mock('@editengage/agents/programmatic-page/programmatic-page.agent', () => ({
  ProgrammaticPageAgent: MockProgrammaticPageAgent
}));

vi.mock('@pydantic/logfire-node', () => ({
  default: {
    span: vi.fn().mockImplementation(
      (_msg: string, _attrs: Record<string, unknown>, callback: (span: { setAttributes: ReturnType<typeof vi.fn> }) => unknown) => {
        return callback({ setAttributes: vi.fn() });
      }
    )
  }
}));
vi.mock('@editengage/agents/research/providers/traceparent', () => ({
  injectTraceHeaders: vi.fn()
}));

import { createQueue, addPipelineJob } from './queue';
import { createWorker, createAgentFromStep } from './worker';
import type { PipelineJobData } from './worker';

function createMockSupabase() {
  const eqFn = vi.fn().mockResolvedValue({ data: null, error: null });
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
  return {
    instance: { from: vi.fn().mockReturnValue({ update: updateFn }) },
    updateFn,
    eqFn
  };
}

describe('BullMQ Queue & Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedWorkerProcessor = null;
  });

  it('adding a job to the queue returns a jobId immediately', async () => {
    mockQueueAdd.mockResolvedValue({ id: 'job-123', name: 'pipeline' });

    const queue = createQueue();
    const job = await addPipelineJob(queue, {
      pipelineId: 'pipeline-1',
      pipelineRunId: 'run-1',
      steps: [
        { agentType: 'topic_queue', config: {} },
        { agentType: 'seo_writer', config: {} }
      ]
    });

    expect(job.id).toBe('job-123');
    expect(mockQueueAdd).toHaveBeenCalledWith(
      'pipeline',
      {
        pipelineId: 'pipeline-1',
        pipelineRunId: 'run-1',
        steps: [
          { agentType: 'topic_queue', config: {} },
          { agentType: 'seo_writer', config: {} }
        ]
      },
      expect.objectContaining({
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 86400, count: 100 },
        removeOnFail: { age: 604800, count: 500 }
      })
    );
  });

  it('worker picks up a job and calls the pipeline orchestrator', async () => {
    const { instance } = createMockSupabase();
    mockOrchestratorRun.mockResolvedValue({ status: 'completed', steps: [{ result: true }] });

    createWorker(instance);
    expect(capturedWorkerProcessor).not.toBeNull();

    const mockJob: PipelineJobData = {
      pipelineId: 'pipeline-1',
      pipelineRunId: 'run-1',
      steps: [{ agentType: 'topic_queue', config: {} }]
    };

    await capturedWorkerProcessor!({ data: mockJob });

    expect(mockOrchestratorRun).toHaveBeenCalledWith(
      expect.objectContaining({
        pipelineRunId: 'run-1',
        agents: expect.any(Array),
        initialInput: {}
      })
    );
  });

  it('worker updates pipeline_runs status to running when job starts', async () => {
    const { instance, updateFn, eqFn } = createMockSupabase();
    mockOrchestratorRun.mockResolvedValue({ status: 'completed', steps: [] });

    createWorker(instance);

    const mockJob: PipelineJobData = {
      pipelineId: 'pipeline-1',
      pipelineRunId: 'run-1',
      steps: []
    };

    await capturedWorkerProcessor!({ data: mockJob });

    expect(instance.from).toHaveBeenCalledWith('pipeline_runs');
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'running' })
    );
    expect(eqFn).toHaveBeenCalledWith('id', 'run-1');
  });

  it('worker updates pipeline_runs status to completed on success', async () => {
    const { instance, updateFn } = createMockSupabase();
    mockOrchestratorRun.mockResolvedValue({ status: 'completed', steps: [{ result: true }] });

    createWorker(instance);

    const mockJob: PipelineJobData = {
      pipelineId: 'pipeline-1',
      pipelineRunId: 'run-1',
      steps: [{ agentType: 'topic_queue', config: {} }]
    };

    await capturedWorkerProcessor!({ data: mockJob });

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' })
    );
  });

  it('worker updates pipeline_runs status to failed on error', async () => {
    const { instance, updateFn } = createMockSupabase();
    mockOrchestratorRun.mockRejectedValue(new Error('Orchestrator exploded'));

    createWorker(instance);

    const mockJob: PipelineJobData = {
      pipelineId: 'pipeline-1',
      pipelineRunId: 'run-1',
      steps: [{ agentType: 'topic_queue', config: {} }]
    };

    await expect(capturedWorkerProcessor!({ data: mockJob })).rejects.toThrow('Orchestrator exploded');

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', error: 'Orchestrator exploded' })
    );
  });

  it('worker retries on transient failure with max 3 retries and exponential backoff', async () => {
    const queue = createQueue();

    expect(mockQueueAdd).not.toHaveBeenCalled();

    mockQueueAdd.mockResolvedValue({ id: 'job-retry', name: 'pipeline' });

    await addPipelineJob(queue, {
      pipelineId: 'pipeline-1',
      pipelineRunId: 'run-1',
      steps: []
    });

    const callArgs = mockQueueAdd.mock.calls[0];
    const jobOptions = callArgs[2];
    expect(jobOptions.attempts).toBe(3);
    expect(jobOptions.backoff).toEqual({ type: 'exponential', delay: 1000 });
  });

  it('worker logs permanently failed jobs after exhausting retries', async () => {
    const { instance } = createMockSupabase();
    createWorker(instance);

    const failedHandler = mockWorkerOn.mock.calls.find(
      (call: unknown[]) => call[0] === 'failed'
    );
    expect(failedHandler).toBeDefined();

    const mockFailedJob = {
      id: 'job-dead',
      data: { pipelineRunId: 'run-dead' },
      attemptsMade: 3,
      opts: { attempts: 3 }
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await failedHandler![1](mockFailedJob, new Error('permanent failure'));

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('job-dead')
    );

    consoleSpy.mockRestore();
  });
});

describe('createAgentFromStep - maps agentType to real agent classes', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      })
    })
  };
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a TopicQueueAgent for topic_queue agentType', () => {
    const mockInstance = { type: 'topic_queue' };
    MockTopicQueueAgent.mockImplementation(() => mockInstance);

    const agent = createAgentFromStep(
      { agentType: 'topic_queue', config: {} },
      { supabase: mockSupabase, fetchFn: mockFetch }
    );

    expect(MockTopicQueueAgent).toHaveBeenCalledWith(mockSupabase);
    expect(agent).toBe(mockInstance);
  });

  it('creates a VarietyEngineAgent for variety_engine agentType', () => {
    const mockInstance = { type: 'variety_engine' };
    MockVarietyEngineAgent.mockImplementation(() => mockInstance);

    const agent = createAgentFromStep(
      { agentType: 'variety_engine', config: {} },
      { supabase: mockSupabase, fetchFn: mockFetch }
    );

    expect(MockVarietyEngineAgent).toHaveBeenCalledWith(mockSupabase);
    expect(agent).toBe(mockInstance);
  });

  it('creates a SeoWriterAgent for seo_writer agentType', () => {
    const mockInstance = { type: 'seo_writer' };
    MockSeoWriterAgent.mockImplementation(() => mockInstance);

    const agent = createAgentFromStep(
      { agentType: 'seo_writer', config: {} },
      { supabase: mockSupabase, fetchFn: mockFetch }
    );

    expect(MockSeoWriterAgent).toHaveBeenCalledWith(mockSupabase, mockFetch);
    expect(agent).toBe(mockInstance);
  });

  it('creates a GhostPublisherAgent for ghost_publisher agentType', () => {
    const mockInstance = { type: 'ghost_publisher' };
    MockGhostPublisherAgent.mockImplementation(() => mockInstance);

    const agent = createAgentFromStep(
      { agentType: 'ghost_publisher', config: {} },
      { supabase: mockSupabase, fetchFn: mockFetch }
    );

    expect(MockGhostPublisherAgent).toHaveBeenCalledWith(mockFetch);
    expect(agent).toBe(mockInstance);
  });

  it('creates a PostBridgePublisherAgent for postbridge_publisher agentType', () => {
    const mockInstance = { type: 'postbridge_publisher' };
    MockPostBridgePublisherAgent.mockImplementation(() => mockInstance);

    const agent = createAgentFromStep(
      { agentType: 'postbridge_publisher', config: {} },
      { supabase: mockSupabase, fetchFn: mockFetch }
    );

    expect(MockPostBridgePublisherAgent).toHaveBeenCalledWith(mockFetch);
    expect(agent).toBe(mockInstance);
  });

  it('creates a ResearchAgent for research_agent agentType', () => {
    const mockInstance = { type: 'research_agent' };
    MockResearchAgent.mockImplementation(() => mockInstance);

    const agent = createAgentFromStep(
      { agentType: 'research_agent', config: {} },
      { supabase: mockSupabase, fetchFn: mockFetch }
    );

    expect(MockResearchAgent).toHaveBeenCalledWith(
      expect.objectContaining({ providers: [], synthesizer: expect.any(Function) })
    );
    expect(agent).toBe(mockInstance);
  });

  it('throws for unsupported agentType', () => {
    expect(() =>
      createAgentFromStep(
        { agentType: 'nonexistent_agent', config: {} },
        { supabase: mockSupabase, fetchFn: mockFetch }
      )
    ).toThrow('Unsupported agent type: nonexistent_agent');
  });
});

describe('Worker wires real agents via createAgentFromStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedWorkerProcessor = null;
  });

  it('passes real agent instances to the orchestrator when processing a job', async () => {
    const { instance } = createMockSupabase();
    const mockAgentInstance = { type: 'topic_queue', execute: vi.fn(), validate: vi.fn() };
    MockTopicQueueAgent.mockImplementation(() => mockAgentInstance);
    mockOrchestratorRun.mockResolvedValue({ status: 'completed', steps: [{}] });

    createWorker(instance);

    const mockJob: PipelineJobData = {
      pipelineId: 'pipeline-1',
      pipelineRunId: 'run-1',
      steps: [{ agentType: 'topic_queue', config: {} }]
    };

    await capturedWorkerProcessor!({ data: mockJob });

    // The orchestrator should receive the real agent instance, not the identity stub
    const orchestratorCall = mockOrchestratorRun.mock.calls[0][0];
    expect(orchestratorCall.agents[0]).toBe(mockAgentInstance);
  });
});

describe('Worker persists pipeline result on completion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedWorkerProcessor = null;
  });

  it('stores orchestrator result in pipeline_runs.result on completion', async () => {
    const { instance, updateFn } = createMockSupabase();
    const pipelineResult = { status: 'completed' as const, steps: [{ title: 'My Article' }] };
    mockOrchestratorRun.mockResolvedValue(pipelineResult);

    createWorker(instance);

    const mockJob: PipelineJobData = {
      pipelineId: 'pipeline-1',
      pipelineRunId: 'run-1',
      steps: [{ agentType: 'topic_queue', config: {} }]
    };

    MockTopicQueueAgent.mockImplementation(() => ({
      type: 'topic_queue', execute: vi.fn(), validate: vi.fn()
    }));

    await capturedWorkerProcessor!({ data: mockJob });

    // The completion update should include the result
    const completionCall = updateFn.mock.calls.find(
      (call: unknown[]) => (call[0] as Record<string, unknown>).status === 'completed'
    );
    expect(completionCall).toBeDefined();
    expect((completionCall![0] as Record<string, unknown>).result).toEqual(pipelineResult);
  });
});
