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
        const output = await agent.execute(currentInput);
        steps.push(output);
        currentInput = output;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { status: 'failed', error: message, failedStep: stepNumber };
      }
    }

    return { status: 'completed', steps };
  }
}
