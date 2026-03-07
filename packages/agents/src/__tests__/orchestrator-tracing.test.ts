import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Agent } from '../types';
import { AgentType } from '../types';

// Mock @pydantic/logfire-node — use vi.hoisted so variables are available in hoisted vi.mock
const { mockSetAttributes, mockSpan } = vi.hoisted(() => ({
  mockSetAttributes: vi.fn(),
  mockSpan: vi.fn()
}));

vi.mock('@pydantic/logfire-node', () => ({
  default: {
    span: mockSpan
  }
}));

import { PipelineOrchestrator } from '../orchestrator';
import type { SupabaseClient } from '../orchestrator';

function createMockSupabase(): SupabaseClient {
  return {
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      })
    })
  };
}

function createMockAgent(type: AgentType, output: unknown): Agent {
  return {
    type,
    execute: vi.fn().mockResolvedValue(output),
    validate: vi.fn().mockReturnValue({ valid: true })
  };
}

describe('PipelineOrchestrator tracing', () => {
  let supabase: SupabaseClient;
  let orchestrator: PipelineOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createMockSupabase();
    orchestrator = new PipelineOrchestrator(supabase);

    // Default: mockSpan executes the callback and returns its result
    mockSpan.mockImplementation(
      async (_name: string, options: { attributes?: Record<string, unknown>; callback: (span: { setAttributes: typeof mockSetAttributes }) => Promise<unknown> }) => {
        return options.callback({ setAttributes: mockSetAttributes });
      }
    );
  });

  describe('T3: pipeline.run span', () => {
    it('creates a pipeline.run span with pipelineRunId and step_count', async () => {
      const agent = createMockAgent(AgentType.SEO_WRITER, { content: 'test' });

      await orchestrator.run({
        pipelineRunId: 'run-123',
        agents: [agent],
        initialInput: { topic: 'test' }
      });

      expect(mockSpan).toHaveBeenCalledWith(
        'pipeline.run',
        expect.objectContaining({
          attributes: expect.objectContaining({
            pipelineRunId: 'run-123',
            'pipeline.step_count': 1
          }),
          callback: expect.any(Function)
        })
      );
    });

    it('records error attributes on the pipeline.run span when an agent fails', async () => {
      const failingAgent = createMockAgent(AgentType.SEO_WRITER, null);
      (failingAgent.execute as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Agent exploded'));

      await orchestrator.run({
        pipelineRunId: 'run-456',
        agents: [failingAgent],
        initialInput: {}
      });

      expect(mockSetAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          'error.message': 'Agent exploded'
        })
      );
    });
  });

  describe('T4: agent.execute span', () => {
    it('creates an agent.execute span for each agent with agentType and stepIndex', async () => {
      const agent1 = createMockAgent(AgentType.RESEARCH_AGENT, { data: 'research' });
      const agent2 = createMockAgent(AgentType.SEO_WRITER, { content: 'article' });

      await orchestrator.run({
        pipelineRunId: 'run-789',
        agents: [agent1, agent2],
        initialInput: {}
      });

      // pipeline.run span + 2 agent.execute spans = 3 calls
      const agentSpanCalls = mockSpan.mock.calls.filter(
        (call: unknown[]) => call[0] === 'agent.execute'
      );

      expect(agentSpanCalls).toHaveLength(2);

      expect(agentSpanCalls[0][1]).toEqual(
        expect.objectContaining({
          attributes: expect.objectContaining({
            agentType: AgentType.RESEARCH_AGENT,
            stepIndex: 0
          })
        })
      );

      expect(agentSpanCalls[1][1]).toEqual(
        expect.objectContaining({
          attributes: expect.objectContaining({
            agentType: AgentType.SEO_WRITER,
            stepIndex: 1
          })
        })
      );
    });

    it('sets agent.output_size attribute on each agent.execute span', async () => {
      const output = { content: 'hello world' };
      const agent = createMockAgent(AgentType.SEO_WRITER, output);

      await orchestrator.run({
        pipelineRunId: 'run-101',
        agents: [agent],
        initialInput: {}
      });

      expect(mockSetAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          'agent.output_size': JSON.stringify(output).length
        })
      );
    });
  });
});
