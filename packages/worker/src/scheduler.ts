import type { QueueInstance } from './queue.js';

interface SchedulableQueue extends QueueInstance {
  removeRepeatable(name: string, repeatOpts: { pattern: string }, jobId: string): Promise<void>;
}

interface PipelineSchedule {
  pipelineId: string;
  cronExpression: string;
  steps: Array<{ agentType: string; config: Record<string, unknown> }>;
}

interface ResearchSchedule {
  researchQueryId: string;
  cronExpression: string;
  query: string;
  providers: string[];
}

export class Scheduler {
  private queue: SchedulableQueue;

  constructor(queue: SchedulableQueue) {
    this.queue = queue;
  }

  async schedulePipeline(schedule: PipelineSchedule): Promise<void> {
    await this.queue.add(
      'pipeline',
      {
        pipelineId: schedule.pipelineId,
        steps: schedule.steps
      },
      {
        repeat: { pattern: schedule.cronExpression },
        jobId: `scheduled-pipeline-${schedule.pipelineId}`
      }
    );
  }

  async scheduleResearch(schedule: ResearchSchedule): Promise<void> {
    await this.queue.add(
      'research',
      {
        researchQueryId: schedule.researchQueryId,
        query: schedule.query,
        providers: schedule.providers
      },
      {
        repeat: { pattern: schedule.cronExpression },
        jobId: `scheduled-research-${schedule.researchQueryId}`
      }
    );
  }

  async pausePipeline(pipelineId: string, cronExpression: string): Promise<void> {
    await this.queue.removeRepeatable(
      'pipeline',
      { pattern: cronExpression },
      `scheduled-pipeline-${pipelineId}`
    );
  }

  async resumePipeline(schedule: PipelineSchedule): Promise<void> {
    await this.schedulePipeline(schedule);
  }
}
