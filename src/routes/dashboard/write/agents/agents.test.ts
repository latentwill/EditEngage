/**
 * @behavior Agent context bundle view shows cross-referenced portfolio data on each agent card
 * @business_rule Agents feel like team members with portfolios showing workflows, topics, styles, destinations, and activity
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));
vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));
vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => ({
    auth: { signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), getSession: vi.fn(), getUser: vi.fn() }
  }))
}));
vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({ auth: { getUser: vi.fn() }, from: vi.fn() })),
  createServiceRoleClient: vi.fn(() => ({ auth: { getUser: vi.fn() }, from: vi.fn() }))
}));

import AgentContextBundle from '$lib/components/AgentContextBundle.svelte';
import AgentsPage from './+page.svelte';
import type { AgentContextData } from './agentContext.js';

// --- Test Data ---

const AGENT_1 = {
  id: 'agent-1',
  name: 'The Analyst',
  description: 'Deep dives into data',
  model: 'anthropic/claude-sonnet-4-6',
  is_active: true,
  system_prompt: 'You are an analyst.',
  project_id: 'proj-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
};

const AGENT_2 = {
  id: 'agent-2',
  name: 'The Storyteller',
  description: 'Narrative style',
  model: 'openai/gpt-4o',
  is_active: false,
  system_prompt: null,
  project_id: 'proj-1',
  created_at: '2026-01-02T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z'
};

const PIPELINE_SEO = {
  id: 'pipe-1',
  name: 'SEO Articles',
  project_id: 'proj-1',
  is_active: true,
  steps: [
    { agent_type: 'topic_queue', config: {}, order: 1 },
    { agent_type: 'seo_writer', config: { writingAgentId: 'agent-1', writingStyleId: 'style-1' }, order: 2 },
    { agent_type: 'ghost_publisher', config: {}, order: 3 }
  ],
  description: 'SEO article pipeline',
  review_mode: 'draft_for_review',
  schedule: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
};

const PIPELINE_EMAIL = {
  id: 'pipe-2',
  name: 'Email Digest',
  project_id: 'proj-1',
  is_active: true,
  steps: [
    { agent_type: 'seo_writer', config: { writingAgentId: 'agent-1' }, order: 1 },
    { agent_type: 'email_publisher', config: {}, order: 2 }
  ],
  description: 'Email digest pipeline',
  review_mode: 'auto_publish',
  schedule: null,
  created_at: '2026-01-02T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z'
};

const STYLE_1 = {
  id: 'style-1',
  name: 'Professional Tone',
  project_id: 'proj-1',
  tone: 'professional',
  voice_guidelines: null,
  avoid_phrases: [],
  example_content: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
};

const EVENT_RECENT = {
  id: 'evt-1',
  project_id: 'proj-1',
  event_type: 'content.generated',
  description: 'Generated article "AI Trends"',
  metadata: { pipeline_id: 'pipe-1' },
  agent_id: 'agent-1',
  module: 'seo_writer',
  is_read: false,
  payload_summary: null,
  artifact_link: null,
  created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
};

// --- Tests ---

describe('AgentContextBundle', () => {
  it('shows workflow count when agent is linked to pipelines', () => {
    const contextData: AgentContextData = {
      workflowCount: 2,
      workflowNames: ['SEO Articles', 'Email Digest'],
      topicCount: 0,
      writingStyleName: null,
      destinations: [],
      lastActivity: null
    };

    render(AgentContextBundle, { props: { context: contextData } });

    expect(screen.getByTestId('workflow-count')).toHaveTextContent('2 workflows');
  });

  it('shows topic count from linked pipelines', () => {
    const contextData: AgentContextData = {
      workflowCount: 1,
      workflowNames: ['SEO Articles'],
      topicCount: 15,
      writingStyleName: null,
      destinations: [],
      lastActivity: null
    };

    render(AgentContextBundle, { props: { context: contextData } });

    expect(screen.getByTestId('topic-count')).toHaveTextContent('15 topics');
  });

  it('shows resolved writing style name from pipeline step config', () => {
    const contextData: AgentContextData = {
      workflowCount: 1,
      workflowNames: ['SEO Articles'],
      topicCount: 0,
      writingStyleName: 'Professional Tone',
      destinations: [],
      lastActivity: null
    };

    render(AgentContextBundle, { props: { context: contextData } });

    expect(screen.getByTestId('writing-style')).toHaveTextContent('Professional Tone');
  });

  it('shows destination types from sibling pipeline steps', () => {
    const contextData: AgentContextData = {
      workflowCount: 1,
      workflowNames: ['SEO Articles'],
      topicCount: 0,
      writingStyleName: null,
      destinations: ['ghost', 'email'],
      lastActivity: null
    };

    render(AgentContextBundle, { props: { context: contextData } });

    const destSection = screen.getByTestId('destinations');
    expect(destSection).toHaveTextContent('Ghost');
    expect(destSection).toHaveTextContent('Email');
  });

  it('shows last activity as relative timestamp', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const contextData: AgentContextData = {
      workflowCount: 0,
      workflowNames: [],
      topicCount: 0,
      writingStyleName: null,
      destinations: [],
      lastActivity: twoHoursAgo
    };

    render(AgentContextBundle, { props: { context: contextData } });

    expect(screen.getByTestId('last-activity')).toHaveTextContent('2h ago');
  });

  it('handles agent with no workflows gracefully', () => {
    const contextData: AgentContextData = {
      workflowCount: 0,
      workflowNames: [],
      topicCount: 0,
      writingStyleName: null,
      destinations: [],
      lastActivity: null
    };

    render(AgentContextBundle, { props: { context: contextData } });

    expect(screen.getByTestId('workflow-count')).toHaveTextContent('No workflows');
    expect(screen.queryByTestId('topic-count')).not.toBeInTheDocument();
    expect(screen.queryByTestId('writing-style')).not.toBeInTheDocument();
    expect(screen.queryByTestId('destinations')).not.toBeInTheDocument();
    expect(screen.getByTestId('last-activity')).toHaveTextContent('No activity');
  });
});

describe('Agents page with context bundles', () => {
  it('renders context bundle for each agent card with correct enrichment data', () => {
    const agentContextMap: Record<string, AgentContextData> = {
      'agent-1': {
        workflowCount: 2,
        workflowNames: ['SEO Articles', 'Email Digest'],
        topicCount: 15,
        writingStyleName: 'Professional Tone',
        destinations: ['ghost', 'email'],
        lastActivity: EVENT_RECENT.created_at
      },
      'agent-2': {
        workflowCount: 0,
        workflowNames: [],
        topicCount: 0,
        writingStyleName: null,
        destinations: [],
        lastActivity: null
      }
    };

    render(AgentsPage, {
      props: {
        data: {
          writingAgents: [AGENT_1, AGENT_2],
          agentContextMap
        }
      }
    });

    const cards = screen.getAllByTestId('agent-card');
    expect(cards).toHaveLength(2);

    // First card (The Analyst) should show portfolio data
    const bundles = screen.getAllByTestId('agent-context-bundle');
    expect(bundles).toHaveLength(2);

    // Verify first agent has enrichment data visible
    expect(bundles[0]).toHaveTextContent('2 workflows');
    expect(bundles[0]).toHaveTextContent('15 topics');
    expect(bundles[0]).toHaveTextContent('Professional Tone');

    // Second agent shows empty state
    expect(bundles[1]).toHaveTextContent('No workflows');
  });
});

describe('Server loader returns enriched agent data', () => {
  it('loads pipelines, events, topic counts, and styles alongside writing agents', async () => {
    // This test verifies the server loader enriches agent data with pipeline context.
    // We test the enrichment logic function directly.

    const { buildAgentContextMap } = await import('./agentContext.js');

    const pipelines = [PIPELINE_SEO, PIPELINE_EMAIL];
    const events = [EVENT_RECENT];
    const topicCounts: Record<string, number> = { 'pipe-1': 10, 'pipe-2': 5 };
    const styles = [STYLE_1];
    const agents = [AGENT_1, AGENT_2];

    const contextMap = buildAgentContextMap(agents, pipelines, events, topicCounts, styles);

    // Agent 1 is in 2 pipelines
    expect(contextMap['agent-1'].workflowCount).toBe(2);
    expect(contextMap['agent-1'].workflowNames).toEqual(['SEO Articles', 'Email Digest']);
    expect(contextMap['agent-1'].topicCount).toBe(15); // 10 + 5
    expect(contextMap['agent-1'].writingStyleName).toBe('Professional Tone');
    expect(contextMap['agent-1'].destinations).toContain('ghost');
    expect(contextMap['agent-1'].destinations).toContain('email');
    expect(contextMap['agent-1'].lastActivity).toBe(EVENT_RECENT.created_at);

    // Agent 2 is in no pipelines
    expect(contextMap['agent-2'].workflowCount).toBe(0);
    expect(contextMap['agent-2'].workflowNames).toEqual([]);
    expect(contextMap['agent-2'].topicCount).toBe(0);
    expect(contextMap['agent-2'].writingStyleName).toBeNull();
    expect(contextMap['agent-2'].destinations).toEqual([]);
    expect(contextMap['agent-2'].lastActivity).toBeNull();
  });
});
