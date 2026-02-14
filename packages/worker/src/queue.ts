import { Queue } from 'bullmq';

export interface QueueInstance {
  add(name: string, data: unknown, opts?: Record<string, unknown>): Promise<{ id: string; name: string }>;
}

export function createQueue(): QueueInstance {
  const queue = new Queue('editengage-pipeline', {
    connection: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379)
    }
  });
  return queue as unknown as QueueInstance;
}

export async function addPipelineJob(
  queue: QueueInstance,
  data: { pipelineId: string; pipelineRunId: string; steps: Array<{ agentType: string; config: Record<string, unknown> }> }
): Promise<{ id: string }> {
  const job = await queue.add('pipeline', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  });
  return { id: job.id };
}
