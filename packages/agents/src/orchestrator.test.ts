import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentType } from './types';
import type { Agent, AgentConfig, ValidationResult } from './types';
import { PipelineOrchestrator } from './orchestrator';
import type { PipelineResult, ProgressUpdate, SupabaseClient } from './orchestrator';

function createMockAgent(
  type: AgentType,
  executeFn: (input: unknown, config?: AgentConfig) => Promise<unknown>
): Agent {
  return {
    type,
    execute: executeFn,
    validate: (_config: AgentConfig): ValidationResult => ({ valid: true })
  };
}

function createMockSupabase(): SupabaseClient {
  const eqFn = vi.fn().mockResolvedValue({ data: null, error: null });
  const updateFn = vi.fn().mockReturnValue({ eq: eqFn });

  return {
    from: vi.fn().mockReturnValue({
      update: updateFn
    })
  };
}

describe('PipelineOrchestrator', () => {
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
  });

  it('executes agents in order, passing output of each as input to the next', async () => {
    const agentA = createMockAgent(AgentType.TOPIC_QUEUE, async (input: unknown) => {
      return { ...(input as Record<string, unknown>), fromA: true };
    });
    const agentB = createMockAgent(AgentType.VARIETY_ENGINE, async (input: unknown) => {
      return { ...(input as Record<string, unknown>), fromB: true };
    });
    const agentC = createMockAgent(AgentType.SEO_WRITER, async (input: unknown) => {
      return { ...(input as Record<string, unknown>), fromC: true };
    });

    const orchestrator = new PipelineOrchestrator(mockSupabase);
    const result = await orchestrator.run({
      pipelineRunId: 'run-1',
      agents: [agentA, agentB, agentC],
      initialInput: { seed: 'data' }
    });

    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.steps).toHaveLength(3);
      expect(result.steps[0]).toEqual({ seed: 'data', fromA: true });
      expect(result.steps[1]).toEqual({ seed: 'data', fromA: true, fromB: true });
      expect(result.steps[2]).toEqual({ seed: 'data', fromA: true, fromB: true, fromC: true });
    }
  });

  it('reports progress at each step via callback', async () => {
    const agents = [
      createMockAgent(AgentType.TOPIC_QUEUE, async () => ({ step: 1 })),
      createMockAgent(AgentType.VARIETY_ENGINE, async () => ({ step: 2 })),
      createMockAgent(AgentType.SEO_WRITER, async () => ({ step: 3 })),
      createMockAgent(AgentType.GHOST_PUBLISHER, async () => ({ step: 4 }))
    ];

    const progressUpdates: ProgressUpdate[] = [];
    const onProgress = vi.fn((update: ProgressUpdate) => {
      progressUpdates.push(update);
    });

    const orchestrator = new PipelineOrchestrator(mockSupabase);
    await orchestrator.run({
      pipelineRunId: 'run-2',
      agents,
      initialInput: {},
      onProgress
    });

    expect(onProgress).toHaveBeenCalledTimes(4);
    expect(progressUpdates[1]).toEqual({
      currentStep: 2,
      totalSteps: 4,
      currentAgent: AgentType.VARIETY_ENGINE
    });
  });

  it('stops execution when an agent throws an error', async () => {
    const executeSpy = vi.fn().mockResolvedValue({ done: true });
    const agentA = createMockAgent(AgentType.TOPIC_QUEUE, async () => ({ fromA: true }));
    const agentB = createMockAgent(AgentType.VARIETY_ENGINE, async () => {
      throw new Error('Agent B failed');
    });
    const agentC = createMockAgent(AgentType.SEO_WRITER, executeSpy);

    const orchestrator = new PipelineOrchestrator(mockSupabase);
    const result = await orchestrator.run({
      pipelineRunId: 'run-3',
      agents: [agentA, agentB, agentC],
      initialInput: {}
    });

    expect(result.status).toBe('failed');
    expect(executeSpy).not.toHaveBeenCalled();
  });

  it('marks pipeline run as failed with error from the failed agent', async () => {
    const agentA = createMockAgent(AgentType.TOPIC_QUEUE, async () => ({ fromA: true }));
    const agentB = createMockAgent(AgentType.VARIETY_ENGINE, async () => {
      throw new Error('Variety engine exploded');
    });

    const orchestrator = new PipelineOrchestrator(mockSupabase);
    const result = await orchestrator.run({
      pipelineRunId: 'run-4',
      agents: [agentA, agentB],
      initialInput: {}
    });

    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.error).toBe('Variety engine exploded');
      expect(result.failedStep).toBe(2);
    }
  });

  it('marks pipeline run as completed with final result on success', async () => {
    const agentA = createMockAgent(AgentType.TOPIC_QUEUE, async () => ({ topic: 'SEO tips' }));
    const agentB = createMockAgent(AgentType.SEO_WRITER, async (input: unknown) => ({
      ...(input as Record<string, unknown>),
      article: 'Great article about SEO tips'
    }));

    const orchestrator = new PipelineOrchestrator(mockSupabase);
    const result = await orchestrator.run({
      pipelineRunId: 'run-5',
      agents: [agentA, agentB],
      initialInput: {}
    });

    expect(result.status).toBe('completed');
    if (result.status === 'completed') {
      expect(result.steps).toHaveLength(2);
      expect(result.steps[1]).toEqual({
        topic: 'SEO tips',
        article: 'Great article about SEO tips'
      });
    }
  });

  it('updates pipeline_runs row in Supabase at each step', async () => {
    const agents = [
      createMockAgent(AgentType.TOPIC_QUEUE, async () => ({ step: 1 })),
      createMockAgent(AgentType.SEO_WRITER, async () => ({ step: 2 }))
    ];

    const orchestrator = new PipelineOrchestrator(mockSupabase);
    await orchestrator.run({
      pipelineRunId: 'run-6',
      agents,
      initialInput: {}
    });

    const fromCalls = (mockSupabase.from as ReturnType<typeof vi.fn>).mock.calls;
    expect(fromCalls.length).toBeGreaterThanOrEqual(2);
    for (const call of fromCalls) {
      expect(call[0]).toBe('pipeline_runs');
    }

    const updateFn = (mockSupabase.from as ReturnType<typeof vi.fn>)().update;
    const updateCalls = (updateFn as ReturnType<typeof vi.fn>).mock.calls;
    expect(updateCalls.length).toBeGreaterThanOrEqual(2);
  });
});
