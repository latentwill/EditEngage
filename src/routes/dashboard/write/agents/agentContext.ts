export interface AgentContextData {
  workflowCount: number;
  workflowNames: string[];
  topicCount: number;
  writingStyleName: string | null;
  destinations: string[];
  lastActivity: string | null;
}

export interface PipelineStep {
  agent_type: string;
  config: Record<string, string | undefined>;
  order: number;
}

export interface Pipeline {
  id: string;
  name: string;
  steps: PipelineStep[];
}

export interface EventRow {
  agent_id: string | null;
  created_at: string;
}

export interface WritingAgent {
  id: string;
}

export interface WritingStyleRef {
  id: string;
  name: string;
}

const DESTINATION_LABEL_MAP: Record<string, string> = {
  ghost_publisher: 'ghost',
  postbridge_publisher: 'postbridge',
  email_publisher: 'email'
};

export function buildAgentContextMap(
  agents: WritingAgent[],
  pipelines: Pipeline[],
  events: EventRow[],
  topicCounts: Record<string, number>,
  styles: WritingStyleRef[]
): Record<string, AgentContextData> {
  const styleMap = new Map(styles.map((s) => [s.id, s.name]));
  const result: Record<string, AgentContextData> = {};

  for (const agent of agents) {
    const linkedPipelines: Pipeline[] = [];
    let writingStyleName: string | null = null;
    const destinationSet = new Set<string>();

    for (const pipeline of pipelines) {
      const steps = pipeline.steps as PipelineStep[];
      const hasAgent = steps.some(
        (step) => step.config?.writingAgentId === agent.id
      );

      if (hasAgent) {
        linkedPipelines.push(pipeline);

        for (const step of steps) {
          if (step.config?.writingAgentId === agent.id && step.config?.writingStyleId) {
            const resolved = styleMap.get(step.config.writingStyleId);
            if (resolved) writingStyleName = resolved;
          }
          const destLabel = DESTINATION_LABEL_MAP[step.agent_type];
          if (destLabel) {
            destinationSet.add(destLabel);
          }
        }
      }
    }

    let topicCount = 0;
    for (const pipeline of linkedPipelines) {
      topicCount += topicCounts[pipeline.id] ?? 0;
    }

    const agentEvents = events
      .filter((e) => e.agent_id === agent.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    result[agent.id] = {
      workflowCount: linkedPipelines.length,
      workflowNames: linkedPipelines.map((p) => p.name),
      topicCount,
      writingStyleName,
      destinations: [...destinationSet],
      lastActivity: agentEvents[0]?.created_at ?? null
    };
  }

  return result;
}
