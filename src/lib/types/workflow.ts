// ============================================================================
// Workflow / Wizard domain types — shared across wizard steps and pages
// ============================================================================

export type AgentType = 'writing' | 'research';

export interface SelectedAgent {
  id: string;
  name: string;
  type: AgentType;
}

export interface UserAgent {
  id: string;
  name: string;
  type: AgentType;
  project_id: string;
  config: Record<string, unknown>;
}
