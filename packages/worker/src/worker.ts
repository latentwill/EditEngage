import { Worker } from 'bullmq';
import { PipelineOrchestrator } from '@editengage/agents/orchestrator';
import { createQueue } from './queue';
import type { QueueInstance } from './queue';

export interface PipelineJobData {
  pipelineId: string;
  pipelineRunId: string;
  steps: Array<{ agentType: string; config: Record<string, unknown> }>;
}

interface SupabaseClient {
  from(table: string): {
    update(data: Record<string, unknown>): {
      eq(column: string, value: string): Promise<{ data: unknown; error: unknown }>;
    };
  };
}

interface JobPayload {
  data: PipelineJobData;
}

interface FailedJob {
  id: string;
  data: PipelineJobData;
  attemptsMade: number;
  opts: { attempts: number };
}

export function createWorker(supabase: SupabaseClient): void {
  const orchestrator = new PipelineOrchestrator(supabase);
  const dlq: QueueInstance = createQueue();

  const worker = new Worker(
    'editengage-pipeline',
    async (job: unknown) => {
      const { data } = job as JobPayload;

      await supabase
        .from('pipeline_runs')
        .update({ status: 'running' })
        .eq('id', data.pipelineRunId);

      const agents = data.steps.map((step) => ({
        type: step.agentType as string,
        execute: async (input: unknown) => input,
        validate: () => ({ valid: true as const })
      }));

      try {
        const result = await orchestrator.run({
          pipelineRunId: data.pipelineRunId,
          agents: agents as Parameters<typeof orchestrator.run>[0]['agents'],
          initialInput: {}
        });

        await supabase
          .from('pipeline_runs')
          .update({ status: 'completed' })
          .eq('id', data.pipelineRunId);

        return result;
      } catch (err) {
        await supabase
          .from('pipeline_runs')
          .update({
            status: 'failed',
            error: err instanceof Error ? err.message : String(err)
          })
          .eq('id', data.pipelineRunId);

        throw err;
      }
    },
    {
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD
      }
    }
  );

  worker.on('failed', async (job: unknown, err: Error) => {
    const failedJob = job as FailedJob;
    if (failedJob.attemptsMade >= failedJob.opts.attempts) {
      await dlq.add('dead-letter', {
        originalJobId: failedJob.id,
        data: failedJob.data,
        error: err.message
      });
    }
  });
}
