/**
 * @behavior StepAgents fetches user's writing agents from the API grouped by type,
 * allows selecting multiple agents, and shows an empty state when none exist.
 * @business_rule Agents come from user data (not hardcoded). They are grouped
 * into "Writing" and "Research" categories. At least one agent must be selected.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import StepAgents from '$lib/components/wizard/StepAgents.svelte';

const MOCK_WRITING_AGENTS = [
  { id: 'agent-w1', name: 'SEO Blog Writer', type: 'writing' as const, project_id: 'proj-1', config: {} },
  { id: 'agent-w2', name: 'Technical Writer', type: 'writing' as const, project_id: 'proj-1', config: {} }
];

const MOCK_RESEARCH_AGENTS = [
  { id: 'agent-r1', name: 'Market Researcher', type: 'research' as const, project_id: 'proj-1', config: {} }
];

const ALL_MOCK_AGENTS = [...MOCK_WRITING_AGENTS, ...MOCK_RESEARCH_AGENTS];

function mockFetchWith(agents: typeof ALL_MOCK_AGENTS) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: agents })
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('StepAgents — Agent Selection (Task 6)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should fetch and display user writing agents grouped under "Writing"', async () => {
    mockFetchWith(ALL_MOCK_AGENTS);

    render(StepAgents, {
      props: {
        projectId: 'proj-1',
        selectedAgents: [],
        onToggleAgent: vi.fn(),
        validationError: null
      }
    });

    await waitFor(() => {
      expect(screen.getByTestId('agent-group-writing')).toBeInTheDocument();
    });

    const writingGroup = screen.getByTestId('agent-group-writing');
    expect(writingGroup.textContent).toContain('SEO Blog Writer');
    expect(writingGroup.textContent).toContain('Technical Writer');
  });

  it('should fetch and display user research agents grouped under "Research"', async () => {
    mockFetchWith(ALL_MOCK_AGENTS);

    render(StepAgents, {
      props: {
        projectId: 'proj-1',
        selectedAgents: [],
        onToggleAgent: vi.fn(),
        validationError: null
      }
    });

    await waitFor(() => {
      expect(screen.getByTestId('agent-group-research')).toBeInTheDocument();
    });

    const researchGroup = screen.getByTestId('agent-group-research');
    expect(researchGroup.textContent).toContain('Market Researcher');
  });

  it('should show empty state when no agents exist', async () => {
    mockFetchWith([]);

    render(StepAgents, {
      props: {
        projectId: 'proj-1',
        selectedAgents: [],
        onToggleAgent: vi.fn(),
        validationError: null
      }
    });

    await waitFor(() => {
      expect(screen.getByTestId('agents-empty-state')).toBeInTheDocument();
    });

    const emptyState = screen.getByTestId('agents-empty-state');
    expect(emptyState.textContent?.toLowerCase()).toContain('create');
    expect(emptyState.textContent?.toLowerCase()).toContain('agent');
  });

  it('should allow selecting multiple agents', async () => {
    const onToggleAgent = vi.fn();
    mockFetchWith(ALL_MOCK_AGENTS);

    render(StepAgents, {
      props: {
        projectId: 'proj-1',
        selectedAgents: [],
        onToggleAgent,
        validationError: null
      }
    });

    await waitFor(() => {
      expect(screen.getAllByTestId('agent-card').length).toBeGreaterThan(0);
    });

    const agentCards = screen.getAllByTestId('agent-card');
    await fireEvent.click(agentCards[0]);
    await fireEvent.click(agentCards[1]);

    expect(onToggleAgent).toHaveBeenCalledTimes(2);
    expect(onToggleAgent).toHaveBeenCalledWith('agent-w1');
    expect(onToggleAgent).toHaveBeenCalledWith('agent-w2');
  });

  it('should not show any hardcoded agent types', async () => {
    mockFetchWith(ALL_MOCK_AGENTS);

    render(StepAgents, {
      props: {
        projectId: 'proj-1',
        selectedAgents: [],
        onToggleAgent: vi.fn(),
        validationError: null
      }
    });

    await waitFor(() => {
      expect(screen.getAllByTestId('agent-card').length).toBeGreaterThan(0);
    });

    const container = screen.getByTestId('step-agents');
    const oldLabels = [
      'Topic Queue', 'Variety Engine', 'SEO Writer', 'Ghost Publisher',
      'Postbridge Publisher', 'Email Publisher', 'Content Reviewer',
      'Research Agent', 'Programmatic Page'
    ];
    for (const label of oldLabels) {
      expect(container.textContent).not.toContain(label);
    }
  });

  it('should display selected agents in a list', async () => {
    mockFetchWith(ALL_MOCK_AGENTS);

    const selectedAgents = [
      { id: 'agent-w1', name: 'SEO Blog Writer', type: 'writing' as const }
    ];

    render(StepAgents, {
      props: {
        projectId: 'proj-1',
        selectedAgents,
        onToggleAgent: vi.fn(),
        validationError: null
      }
    });

    await waitFor(() => {
      expect(screen.getByTestId('selected-agent-item')).toBeInTheDocument();
    });

    expect(screen.getByTestId('selected-agent-item').textContent).toContain('SEO Blog Writer');
  });

  it('should call fetch with the correct project_id URL', async () => {
    const fetchMock = mockFetchWith(ALL_MOCK_AGENTS);

    render(StepAgents, {
      props: {
        projectId: 'proj-1',
        selectedAgents: [],
        onToggleAgent: vi.fn(),
        validationError: null
      }
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/v1/writing-agents?project_id=proj-1');
    });
  });
});
