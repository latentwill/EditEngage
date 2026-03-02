import { createQueue } from '../../../packages/worker/src/queue.js';
import type { QueueInstance } from '../../../packages/worker/src/queue.js';

let queue: QueueInstance | null = null;

function getQueue(): QueueInstance {
  if (!queue) {
    queue = createQueue();
  }
  return queue;
}

export async function addResearchJob(
  data: { queryId: string; providerChain: Array<{ provider: string; role: string }> }
): Promise<{ id: string }> {
  const job = await getQueue().add('research', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  });
  return { id: job.id };
}
