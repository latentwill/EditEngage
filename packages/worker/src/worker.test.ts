import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock bullmq before importing anything that uses it
const mockQueueAdd = vi.fn();
const mockWorkerOn = vi.fn();
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

// Mock the orchestrator
const mockOrchestratorRun = vi.fn();
vi.mock('@editengage/agents/orchestrator', () => {
  return {
    PipelineOrchestrator: vi.fn().mockImplementation(() => ({
      run: mockOrchestratorRun
    }))
  };
});

import { createQueue, addPipelineJob } from './queue';
import { createWorker } from './worker';
import type { PipelineJobData } from './worker';

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
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 }
      }
    );
  });

  it('worker picks up a job and calls the pipeline orchestrator', async () => {
    const eqFn = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    const mockSupabase = {
      from: vi.fn().mockReturnValue({ update: updateFn })
    };
    mockOrchestratorRun.mockResolvedValue({ status: 'completed', steps: [{ result: true }] });

    createWorker(mockSupabase);

    expect(capturedWorkerProcessor).not.toBeNull();

    const mockJob: PipelineJobData = {
      pipelineId: 'pipeline-1',
      pipelineRunId: 'run-1',
      steps: [
        { agentType: 'topic_queue', config: {} }
      ]
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
    const eqFn = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    const mockSupabase = {
      from: vi.fn().mockReturnValue({ update: updateFn })
    };
    mockOrchestratorRun.mockResolvedValue({ status: 'completed', steps: [] });

    createWorker(mockSupabase);

    const mockJob: PipelineJobData = {
      pipelineId: 'pipeline-1',
      pipelineRunId: 'run-1',
      steps: []
    };

    await capturedWorkerProcessor!({ data: mockJob });

    expect(mockSupabase.from).toHaveBeenCalledWith('pipeline_runs');
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'running' })
    );
    expect(eqFn).toHaveBeenCalledWith('id', 'run-1');
  });

  it('worker updates pipeline_runs status to completed on success', async () => {
    const eqFn = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    const mockSupabase = {
      from: vi.fn().mockReturnValue({ update: updateFn })
    };
    mockOrchestratorRun.mockResolvedValue({ status: 'completed', steps: [{ result: true }] });

    createWorker(mockSupabase);

    const mockJob: PipelineJobData = {
      pipelineId: 'pipeline-1',
      pipelineRunId: 'run-1',
      steps: [{ agentType: 'topic_queue', config: {} }]
    };

    await capturedWorkerProcessor!({ data: mockJob });

    // Should have been called with 'completed' status
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' })
    );
  });

  it('worker updates pipeline_runs status to failed on error', async () => {
    const eqFn = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    const mockSupabase = {
      from: vi.fn().mockReturnValue({ update: updateFn })
    };
    mockOrchestratorRun.mockRejectedValue(new Error('Orchestrator exploded'));

    createWorker(mockSupabase);

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

  it('worker moves permanently failed jobs to dead-letter queue', async () => {
    const eqFn = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
    const mockSupabase = {
      from: vi.fn().mockReturnValue({ update: updateFn })
    };
    createWorker(mockSupabase);

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

    const dlqAddSpy = mockQueueAdd;
    dlqAddSpy.mockResolvedValue({ id: 'dlq-1' });

    await failedHandler![1](mockFailedJob, new Error('permanent failure'));

    expect(dlqAddSpy).toHaveBeenCalledWith(
      'dead-letter',
      expect.objectContaining({
        originalJobId: 'job-dead',
        error: 'permanent failure'
      })
    );
  });
});
