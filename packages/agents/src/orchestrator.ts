import Logfire from '@pydantic/logfire-node';
import type { Agent, AgentType, AgentConfig } from './types';

export interface ProgressUpdate {
  currentStep: number;
  totalSteps: number;
  currentAgent: AgentType;
}

export interface SupabaseClient {
  from(table: string): {
    update(data: Record<string, unknown>): {
      eq(column: string, value: string): Promise<{ data: unknown; error: unknown }>;
    };
  };
}

export interface PipelineRunOptions {
  pipelineRunId: string;
  agents: Agent[];
  initialInput: unknown;
  onProgress?: (update: ProgressUpdate) => void;
}

export type PipelineResult =
  | { status: 'completed'; steps: unknown[] }
  | { status: 'failed'; error: string; failedStep: number };

export class PipelineOrchestrator {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async run(options: PipelineRunOptions): Promise<PipelineResult> {
    return Logfire.span('workflow.orchestrate', { attributes: { pipelineRunId: options.pipelineRunId, 'workflow.step_count': options.agents.length }, callback: async (span: import('@opentelemetry/api').Span) => {
      const { pipelineRunId, agents, initialInput, onProgress } = options;
      const steps: unknown[] = [];
      let currentInput = initialInput;

      for (let i = 0; i < agents.length; i++) {
        const agent = agents[i];
        const stepNumber = i + 1;

        if (onProgress) {
          onProgress({
            currentStep: stepNumber,
            totalSteps: agents.length,
            currentAgent: agent.type
          });
        }

        await this.supabase
          .from('pipeline_runs')
          .update({
            current_step: stepNumber,
            total_steps: agents.length,
            current_agent: agent.type
          })
          .eq('id', pipelineRunId);

        try {
          const output = await Logfire.span(`step.${stepNumber} ${agent.type}`, { attributes: { 'step.agent_type': agent.type, 'step.index': i, 'step.number': stepNumber }, callback: async (agentSpan: import('@opentelemetry/api').Span) => {
            const result = await agent.execute(currentInput);
            agentSpan.setAttributes({ 'agent.output_size': JSON.stringify(result).length });
            return result;
          }});
          steps.push(output);
          currentInput = { ...(currentInput as Record<string, unknown>), ...(output as Record<string, unknown>) };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          span.setAttributes({ error: true, 'error.message': message });
          return { status: 'failed' as const, error: message, failedStep: stepNumber };
        }
      }

      return { status: 'completed' as const, steps };
    }});
  }
}
