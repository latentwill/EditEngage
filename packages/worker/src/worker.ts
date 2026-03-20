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
export interface PipelineJobData {
  readonly pipelineId: string;
  readonly pipelineRunId: string;
  readonly steps: ReadonlyArray<{ agentType?: string; agent_type?: string; config?: Record<string, unknown> }>;
}

interface SupabaseClient {
  from(table: string): {
    select(columns?: string): {
      eq(column: string, value: string): {
        single(): Promise<{ data: Record<string, unknown> | null; error: unknown }>;
      };
    };
    insert(data: Record<string, unknown> | Record<string, unknown>[]): {
      select(): {
        single(): Promise<{ data: Record<string, unknown> | null; error: unknown }>;
      };
    };
    update(data: Record<string, unknown>): {
      eq(column: string, value: string): Promise<{ data: unknown; error: unknown }>;
    };
  };
}

interface PipelineStep {
  agentType?: string;
  agent_type?: string;
  agent_id?: string;
  topic_id?: string;
  destination_id?: string;
  config?: Record<string, unknown>;
}

async function hydrateStepInput(
  step: PipelineStep,
  supabase: SupabaseClient
): Promise<{ input: Record<string, unknown>; config: Record<string, unknown> }> {
  const agentType = step.agentType ?? step.agent_type ?? '';

  if (agentType === 'writing' || agentType === 'seo_writer') {
    const [topicResult, agentResult] = await Promise.all([
      step.topic_id
        ? supabase.from('topic_queue').select('*').eq('id', step.topic_id).single()
        : Promise.resolve({ data: null, error: null }),
      step.agent_id
        ? supabase.from('writing_agents').select('*').eq('id', step.agent_id).single()
        : Promise.resolve({ data: null, error: null })
    ]);

    const topic = topicResult.data ?? { title: 'Untitled', keywords: [] };
    const writingAgent = agentResult.data;
    const writingStyleId = (writingAgent as Record<string, unknown>)?.writing_style_id as string ?? '';

    return {
      input: {
        topic,
        canonical: (topic as Record<string, unknown>).title ?? 'Untitled',
        hints: {
          structureHint: 'standard blog post with introduction, body, and conclusion',
          exampleSeed: '',
          avoidList: []
        }
      },
      config: {
        writingStyleId,
        serpResearch: false,
        ...step.config
      }
    };
  }

  return { input: {}, config: step.config ?? {} };
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
  step: { agentType?: string; agent_type?: string; config?: Record<string, unknown> },
  deps: AgentDeps
): PipelineAgent {
  const { supabase, fetchFn } = deps;
  const agentType = step.agentType ?? step.agent_type ?? '';

  switch (agentType) {
    case 'topic_queue':
      return new TopicQueueAgent(supabase as AgentConstructorArg<typeof TopicQueueAgent>);
    case 'variety_engine':
      return new VarietyEngineAgent(supabase as AgentConstructorArg<typeof VarietyEngineAgent>);
    case 'writing':
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
    case 'research':
    case 'research_agent':
      return new ResearchAgent({
        providers: [],
        synthesizer: async (citations: unknown[]) => citations.map(String).join('\n')
      } as AgentConstructorArg<typeof ResearchAgent>);
    case 'programmatic_page': {
      const llmServiceUrl = process.env.LLM_SERVICE_URL ?? 'http://llm-service:8000';
      const llmFn = async (prompt: string): Promise<string> => {
        return Logfire.span('llm.call', {
          attributes: {
            'llm.provider': 'openrouter',
            'llm.model': 'anthropic/claude-sonnet-4',
            'llm.prompt_length': prompt.length
          },
          callback: async (span) => {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          injectTraceHeaders(headers);
          const response = await fetchFn(`${llmServiceUrl}/v1/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: 'anthropic/claude-sonnet-4',
              messages: [{ role: 'user', content: prompt }]
            })
          });
          span.setAttributes({ 'llm.response_status': response.ok ? 'ok' : 'error' });
          const data = await response.json() as { choices: Array<{ message: { content: string } }> };
          return data.choices[0]?.message?.content ?? '';
        }});
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

interface SeoWriterOutput {
  title: string;
  body: string;
  metaDescription: string;
  tags: string[];
  seoScore: number;
  suggestedTopics: string[];
}

async function saveContentFromResult(
  result: { status: string; steps?: unknown[] },
  pipelineRunId: string,
  projectId: string,
  supabase: SupabaseClient
): Promise<void> {
  if (result.status !== 'completed' || !result.steps?.length) return;

  for (const step of result.steps) {
    const output = step as SeoWriterOutput;
    if (!output.title || !output.body) continue;

    const { data: saved, error } = await supabase
      .from('content')
      .insert({
        project_id: projectId,
        pipeline_run_id: pipelineRunId,
        title: output.title,
        body: { html: output.body },
        meta_description: output.metaDescription ?? '',
        tags: output.tags ?? [],
        content_type: 'article',
        status: 'draft'
      })
      .select()
      .single();

    if (error) {
      console.error(`[worker] Failed to save content: ${JSON.stringify(error)}`);
    } else if (saved) {
      console.log(`[worker] Content saved: "${output.title}"`);
      await supabase.from('events').insert({
        project_id: projectId,
        event_type: 'content_created',
        module: 'writing',
        payload_summary: `Content created: "${output.title}"`,
        artifact_link: `/dashboard/write/content?highlight=${saved.id}`,
        metadata: { pipeline_run_id: pipelineRunId, content_id: saved.id },
      });
    }
  }
}

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
  const deps: AgentDeps = { supabase, fetchFn: globalThis.fetch };

  const worker = new Worker(
    QUEUE_NAME,
    async (job: unknown) => {
      const { data } = job as JobPayload;
      const typedJob = job as { id?: string; attemptsMade?: number };

      return Logfire.span('job.process', {
        attributes: {
          'job.id': typedJob.id ?? 'unknown',
          'job.queue': QUEUE_NAME,
          'job.attempt': typedJob.attemptsMade ?? 1,
        },
        callback: async (span) => {
        const { pipelineRunId, steps } = data;

        await supabase
          .from(PIPELINE_RUNS_TABLE)
          .update({ status: 'running' })
          .eq('id', pipelineRunId);

        console.log(`[worker] Processing job ${typedJob.id} with ${steps.length} steps`);
        console.log(`[worker] Steps:`, JSON.stringify(steps));

        const agents = steps.map((step) => createAgentFromStep(step, deps));
        const firstStep = steps[0] as PipelineStep | undefined;
        console.log(`[worker] First step agent_type: ${firstStep?.agent_type ?? firstStep?.agentType ?? 'none'}`);

        const hydrated = firstStep
          ? await hydrateStepInput(firstStep, supabase)
          : { input: {}, config: {} };
        console.log(`[worker] Hydrated input keys: ${Object.keys(hydrated.input)}`);
        console.log(`[worker] Hydrated topic: ${JSON.stringify((hydrated.input as Record<string, unknown>).topic ?? 'none')}`);

        try {
          const result = await orchestrator.run({
            pipelineRunId,
            agents: agents as Parameters<typeof orchestrator.run>[0]['agents'],
            initialInput: hydrated.input
          });

          const pipelineStatus = (result as { status: string }).status;
          if (pipelineStatus === 'failed') {
            const errorMsg = (result as { error?: string }).error ?? 'Pipeline failed';
            await supabase
              .from(PIPELINE_RUNS_TABLE)
              .update({ status: 'failed', error: errorMsg, result })
              .eq('id', pipelineRunId);

            span.setAttributes({ 'job.status': 'failed', error: true });
            console.error(`[worker] Pipeline failed at step ${(result as { failedStep?: number }).failedStep}: ${errorMsg}`);

            return result;
          }

          await supabase
            .from(PIPELINE_RUNS_TABLE)
            .update({ status: 'completed', result })
            .eq('id', pipelineRunId);

          const projectId = ((hydrated.input as Record<string, unknown>).topic as Record<string, unknown>)?.project_id as string;
          if (projectId) {
            await saveContentFromResult(result as { status: string; steps?: unknown[] }, pipelineRunId, projectId, supabase);
          }

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
      }});
    },
    { connection: getRedisConnection() }
  );

  worker.on('failed', async (job: unknown, err: Error) => {
    const failedJob = job as FailedJob;
    if (failedJob.attemptsMade >= failedJob.opts.attempts) {
      console.error(`[worker] Job ${failedJob.id} permanently failed after ${failedJob.attemptsMade} attempts: ${err.message}`);
    }
  });
}
