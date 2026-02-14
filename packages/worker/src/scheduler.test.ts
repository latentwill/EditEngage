import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Scheduler } from './scheduler.js';
import type { QueueInstance } from './queue.js';

function createMockQueue(): QueueInstance & {
  removeRepeatable: ReturnType<typeof vi.fn>;
} {
  return {
    add: vi.fn().mockResolvedValue({ id: 'job-1', name: 'pipeline' }),
    removeRepeatable: vi.fn().mockResolvedValue(undefined)
  };
}

/**
 * @behavior Scheduler manages BullMQ repeatable jobs for pipelines and research queries
 * @business_rule Cron expressions drive automated pipeline execution and research scheduling
 */
describe('Scheduler', () => {
  let queue: ReturnType<typeof createMockQueue>;
  let scheduler: Scheduler;

  beforeEach(() => {
    vi.clearAllMocks();
    queue = createMockQueue();
    scheduler = new Scheduler(queue);
  });

  /**
   * @behavior Scheduler creates BullMQ repeatable job from pipeline cron expression
   * @business_rule Pipelines with cron schedules must be enqueued as repeatable BullMQ jobs
   */
  it('creates BullMQ repeatable job from pipeline cron expression', async () => {
    await scheduler.schedulePipeline({
      pipelineId: 'pipeline-1',
      cronExpression: '0 9 * * 1',
      steps: [
        { agentType: 'topic_queue', config: {} },
        { agentType: 'seo_writer', config: {} }
      ]
    });

    expect(queue.add).toHaveBeenCalledWith(
      'pipeline',
      {
        pipelineId: 'pipeline-1',
        steps: [
          { agentType: 'topic_queue', config: {} },
          { agentType: 'seo_writer', config: {} }
        ]
      },
      {
        repeat: { pattern: '0 9 * * 1' },
        jobId: 'scheduled-pipeline-pipeline-1'
      }
    );
  });

  /**
   * @behavior Scheduler creates BullMQ repeatable job from research query cron expression
   * @business_rule Research queries with cron schedules must be enqueued as repeatable BullMQ jobs
   */
  it('creates BullMQ repeatable job from research query cron expression', async () => {
    await scheduler.scheduleResearch({
      researchQueryId: 'research-1',
      cronExpression: '0 */6 * * *',
      query: 'TypeScript trends 2026',
      providers: ['perplexity', 'tavily']
    });

    expect(queue.add).toHaveBeenCalledWith(
      'research',
      {
        researchQueryId: 'research-1',
        query: 'TypeScript trends 2026',
        providers: ['perplexity', 'tavily']
      },
      {
        repeat: { pattern: '0 */6 * * *' },
        jobId: 'scheduled-research-research-1'
      }
    );
  });

  /**
   * @behavior Pausing a pipeline removes its repeatable job
   * @business_rule Paused pipelines must not have active repeatable jobs in the queue
   */
  it('pausing a pipeline removes its repeatable job', async () => {
    await scheduler.pausePipeline('pipeline-1', '0 9 * * 1');

    expect(queue.removeRepeatable).toHaveBeenCalledWith(
      'pipeline',
      { pattern: '0 9 * * 1' },
      'scheduled-pipeline-pipeline-1'
    );
  });

  /**
   * @behavior Resuming a pipeline re-creates its repeatable job
   * @business_rule Resumed pipelines must have their repeatable job re-created with original cron expression
   */
  it('resuming a pipeline re-creates its repeatable job', async () => {
    await scheduler.resumePipeline({
      pipelineId: 'pipeline-1',
      cronExpression: '0 9 * * 1',
      steps: [
        { agentType: 'topic_queue', config: {} },
        { agentType: 'seo_writer', config: {} }
      ]
    });

    expect(queue.add).toHaveBeenCalledWith(
      'pipeline',
      {
        pipelineId: 'pipeline-1',
        steps: [
          { agentType: 'topic_queue', config: {} },
          { agentType: 'seo_writer', config: {} }
        ]
      },
      {
        repeat: { pattern: '0 9 * * 1' },
        jobId: 'scheduled-pipeline-pipeline-1'
      }
    );
  });
});
