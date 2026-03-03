// ============================================================================
// Research domain types — shared across components and routes
// ============================================================================

export interface BriefSource {
  url: string;
  title: string;
}

export interface BriefFinding {
  provider: string;
  content: string;
  sources: BriefSource[];
}

export interface BriefCitation {
  url: string;
  title: string;
  snippet: string;
  provider: string;
  date?: string | null;
  relevance_score?: number | null;
}

export type ResearchOutputType = 'topic_candidate' | 'source_document' | 'competitive_signal' | 'data_point';

export interface ResearchBrief {
  id: string;
  query_id?: string;
  summary: string | null;
  findings: BriefFinding[];
  output_type?: ResearchOutputType;
  citations?: BriefCitation[];
  created_at: string;
}

export interface ProviderChainEntry {
  provider: string;
  role: string;
}

export const LIFECYCLE_STEPS = ['Queued', 'Running', 'Complete', 'Consumed'] as const;
export type LifecycleStep = typeof LIFECYCLE_STEPS[number];

export const STATUS_TO_LIFECYCLE_STEP: Record<string, number> = {
  queued: 0,
  running: 1,
  active: 1,
  complete: 2,
  consumed: 3,
  idle: -1,
  error: -1,
};
