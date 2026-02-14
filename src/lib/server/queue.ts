import { createQueue, addPipelineJob as workerAddPipelineJob } from '../../../packages/worker/src/queue.js';
import type { QueueInstance } from '../../../packages/worker/src/queue.js';

let queue: QueueInstance | null = null;

function getQueue(): QueueInstance {
  if (!queue) {
    queue = createQueue();
  }
  return queue;
}

export async function addPipelineJob(
  data: { pipelineId: string; pipelineRunId: string; steps: Array<{ agentType: string; config: Record<string, unknown> }> }
): Promise<{ id: string }> {
  return workerAddPipelineJob(getQueue(), data);
}
