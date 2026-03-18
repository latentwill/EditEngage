import { Worker } from 'bullmq';
import Logfire from '@pydantic/logfire-node';
import { PipelineOrchestrator } from '@editengage/agents/orchestrator';
import { TopicQueueAgent } from '@editengage/agents/topic-queue/topic-queue.agent';
import { VarietyEngineAgent } from '@editengage/agents/variety-engine/variety-engine.agent';
import { SeoWriterAgent } from '@editengage/agents/seo-writer/seo-writer.agent';
import { GhostPublisherAgent } from '@editengage/agents/ghost-publisher/ghost-publisher.agent';
import { PostBridgePublisherAgent } from '@editengage/agents/postbridge-publisher/postbridge-publisher.agent';
import { EmailPublisherAgent } from '@editengage/agents/email-publisher/email-publisher.agent';
import { ResearchAgent } from '@editengage/agents/research/research.agent';
import { ProgrammaticPageAgent } from '@editengage/agents/programmatic-page/programmatic-page.agent';
import { injectTraceHeaders } from '@editengage/agents/research/providers/traceparent';
import { createQueue } from './queue';
import type { QueueInstance } from './queue';

export interface PipelineJobData {
  readonly pipelineId: string;
  readonly pipelineRunId: string;
  readonly steps: ReadonlyArray<{ agentType: string; config: Record<string, unknown> }>;
}

interface SupabaseClient {
  from(table: string): {
    update(data: Record<string, unknown>): {
      eq(column: string, value: string): Promise<{ data: unknown; error: unknown }>;
    };
  };
}

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export interface AgentDeps {
  readonly supabase: SupabaseClient;
  readonly fetchFn: FetchFn;
}

interface JobPayload {
  readonly data: PipelineJobData;
}

interface FailedJob {
  readonly id: string;
  readonly data: PipelineJobData;
  readonly attemptsMade: number;
  readonly opts: { readonly attempts: number };
}

interface PipelineAgent {
  readonly type: string;
  execute(input: unknown, config?: Record<string, unknown>): Promise<unknown>;
  validate(config: Record<string, unknown>): { valid: boolean; errors?: string[] };
}

type AgentConstructorArg<T extends new (...args: never[]) => unknown> = ConstructorParameters<T>[0];
type AgentConstructorArg2<T extends new (...args: never[]) => unknown> = ConstructorParameters<T>[1];

export function createAgentFromStep(
  step: { agentType: string; config: Record<string, unknown> },
  deps: AgentDeps
): PipelineAgent {
  const { supabase, fetchFn } = deps;

  switch (step.agentType) {
    case 'topic_queue':
      return new TopicQueueAgent(supabase as AgentConstructorArg<typeof TopicQueueAgent>);
    case 'variety_engine':
      return new VarietyEngineAgent(supabase as AgentConstructorArg<typeof VarietyEngineAgent>);
    case 'seo_writer':
      return new SeoWriterAgent(
        supabase as AgentConstructorArg<typeof SeoWriterAgent>,
        fetchFn as AgentConstructorArg2<typeof SeoWriterAgent>
      );
    case 'ghost_publisher':
      return new GhostPublisherAgent(fetchFn as AgentConstructorArg<typeof GhostPublisherAgent>);
    case 'postbridge_publisher':
      return new PostBridgePublisherAgent(fetchFn as AgentConstructorArg<typeof PostBridgePublisherAgent>);
    case 'email_publisher':
      return new EmailPublisherAgent(
        (() => { throw new Error('Email transporter not configured'); }) as AgentConstructorArg<typeof EmailPublisherAgent>
      );
    case 'research_agent':
      return new ResearchAgent({
        providers: [],
        synthesizer: async (citations: unknown[]) => citations.map(String).join('\n')
      } as AgentConstructorArg<typeof ResearchAgent>);
    case 'programmatic_page': {
      const llmServiceUrl = process.env.LLM_SERVICE_URL ?? 'http://llm-service:8000';
      const llmFn = async (prompt: string): Promise<string> => {
        return Logfire.span('llm.call', {
          'llm.provider': 'openrouter',
          'llm.model': 'anthropic/claude-sonnet-4-20250514',
          'llm.prompt_length': prompt.length
        }, async (span) => {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          injectTraceHeaders(headers);
          const response = await fetchFn(`${llmServiceUrl}/v1/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: 'anthropic/claude-sonnet-4-20250514',
              messages: [{ role: 'user', content: prompt }]
            })
          });
          span.setAttributes({ 'llm.response_status': response.ok ? 'ok' : 'error' });
          const data = await response.json() as { choices: Array<{ message: { content: string } }> };
          return data.choices[0]?.message?.content ?? '';
        });
      };
      return new ProgrammaticPageAgent(
        llmFn as AgentConstructorArg<typeof ProgrammaticPageAgent>,
        { publish: async () => ({ ghostPostId: '', slug: '', url: '' }) } as AgentConstructorArg2<typeof ProgrammaticPageAgent>
      );
    }
    default:
      throw new Error(`Unsupported agent type: ${step.agentType}`);
  }
}

const QUEUE_NAME = 'editengage-pipeline';
const PIPELINE_RUNS_TABLE = 'pipeline_runs';

function getRedisConnection(): { host: string; port: number; password: string | undefined } {
  return {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD
  };
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function createWorker(supabase: SupabaseClient): void {
  const orchestrator = new PipelineOrchestrator(supabase);
  const dlq: QueueInstance = createQueue();
  const deps: AgentDeps = { supabase, fetchFn: globalThis.fetch };

  const worker = new Worker(
    QUEUE_NAME,
    async (job: unknown) => {
      const { data } = job as JobPayload;
      const typedJob = job as { id?: string; attemptsMade?: number };

      return Logfire.span('job.process', {
        'job.id': typedJob.id ?? 'unknown',
        'job.queue': QUEUE_NAME,
        'job.attempt': typedJob.attemptsMade ?? 1,
      }, async (span) => {
        const { pipelineRunId, steps } = data;

        await supabase
          .from(PIPELINE_RUNS_TABLE)
          .update({ status: 'running' })
          .eq('id', pipelineRunId);

        const agents = steps.map((step) => createAgentFromStep(step, deps));

        try {
          const result = await orchestrator.run({
            pipelineRunId,
            agents: agents as Parameters<typeof orchestrator.run>[0]['agents'],
            initialInput: {}
          });

          await supabase
            .from(PIPELINE_RUNS_TABLE)
            .update({ status: 'completed', result })
            .eq('id', pipelineRunId);

          span.setAttributes({ 'job.status': 'completed' });

          return result;
        } catch (err) {
          await supabase
            .from(PIPELINE_RUNS_TABLE)
            .update({ status: 'failed', error: toErrorMessage(err) })
            .eq('id', pipelineRunId);

          span.setAttributes({ 'job.status': 'failed', error: true });

          throw err;
        }
      });
    },
    { connection: getRedisConnection() }
  );

  worker.on('failed', async (job: unknown, err: Error) => {
    const failedJob = job as FailedJob;
    if (failedJob.attemptsMade >= failedJob.opts.attempts) {
      await dlq.add('dead-letter', {
        originalJobId: failedJob.id,
        data: failedJob.data,
        error: err.message
      }, { removeOnComplete: { age: 604800, count: 100 }, removeOnFail: { age: 604800, count: 100 } } as Record<string, unknown>);
    }
  });
}
