/**
 * Acceptance tests for Workflow & Research Post-Build Fixes.
 *
 * These tests are written RED-first: they describe the CORRECT behavior
 * that should exist after each feature is implemented. They will FAIL
 * against the current codebase because the features have not been built yet.
 *
 * Feature tracker (from REQUIREMENTS.md):
 *  US-001: Select user-created agents in workflow
 *  US-002: Configure each agent inline (topic + destination)
 *  US-003: Human-friendly schedule picker
 *  US-004: Running workflow status badge
 *  US-005: Workflow run logs on detail page
 *  US-006: Bottom notification ticker for workflow logs
 *  US-007: Fix research query save button
 */
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Global mocks shared across all test groups
// ---------------------------------------------------------------------------

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

const mockGoto = vi.fn();
vi.mock('$app/navigation', () => ({
  goto: mockGoto
}));

// --- Supabase chain mock builder ---

function createChainMock(terminalValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(terminalValue);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(terminalValue));
  return chain;
}

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn()
};

const mockSupabaseClient = {
  channel: vi.fn().mockReturnValue(mockChannel),
  removeChannel: vi.fn(),
  from: vi.fn().mockReturnValue(createChainMock({ data: [], error: null })),
  auth: {
    getUser: vi.fn(() =>
      Promise.resolve({
        data: { user: { id: 'user-1' } },
        error: null
      })
    )
  }
};

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => mockSupabaseClient)
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabaseClient),
  createServiceRoleClient: vi.fn(() => mockSupabaseClient)
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// --- Shared test data ---

const writingAgents = [
  { id: 'agent-w1', name: 'SEO Blog Writer', type: 'writing', project_id: 'proj-1', config: {} },
  { id: 'agent-w2', name: 'Newsletter Writer', type: 'writing', project_id: 'proj-1', config: {} }
];

const researchAgents = [
  { id: 'agent-r1', name: 'Market Researcher', type: 'research', project_id: 'proj-1', config: {} },
  { id: 'agent-r2', name: 'Competitor Tracker', type: 'research', project_id: 'proj-1', config: {} }
];

const allAgents = [...writingAgents, ...researchAgents];

const userTopics = [
  { id: 'topic-1', title: 'SaaS Marketing', project_id: 'proj-1', status: 'active' },
  { id: 'topic-2', title: 'Developer Tools', project_id: 'proj-1', status: 'active' }
];

const userDestinations = [
  { id: 'dest-1', name: 'Ghost CMS', type: 'ghost', project_id: 'proj-1' },
  { id: 'dest-2', name: 'Postbridge', type: 'postbridge', project_id: 'proj-1' }
];

/**
 * URL-aware fetch mock that routes requests to the correct response
 * based on the URL pattern. This matches how the components actually
 * make separate fetch calls for agents, topics, and destinations.
 */
function setupFetchRouter(overrides?: { agents?: typeof allAgents; saveResponse?: { ok: boolean; status?: number; json?: () => Promise<unknown> } }) {
  const agents = overrides?.agents ?? allAgents;
  mockFetch.mockImplementation((url: string, options?: RequestInit) => {
    if (typeof url === 'string' && url.includes('/api/v1/writing-agents')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: agents })
      });
    }
    if (typeof url === 'string' && url.includes('/api/v1/topics')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: userTopics })
      });
    }
    if (typeof url === 'string' && url.includes('/api/v1/destinations')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: userDestinations })
      });
    }
    if (typeof url === 'string' && url.includes('/api/v1/workflows') && options?.method === 'POST') {
      if (overrides?.saveResponse) return Promise.resolve(overrides.saveResponse);
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: { id: 'pipeline-new' } }) });
    }
    if (typeof url === 'string' && url.includes('/api/v1/research') && options?.method === 'POST') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: { id: 'rq-new', name: 'AI Trends' } }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
  });
}

// ===========================================================================
// US-001: Select User-Created Agents in Workflow
// ===========================================================================

describe('US-001 -- Select User-Created Agents in Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  /**
   * @behavior Writing agents fetched from the database appear grouped
   *   under a "Writing" heading on the agent selection step
   * @business_rule Workflows use agents the user has already configured,
   *   not generic placeholders
   */
  it('AC-001.1: Writing agents load from database grouped under "Writing"', async () => {
    // Given I am on the workflow agent selection step
    setupFetchRouter();

    const WorkflowWizard = (
      await import('../../lib/components/WorkflowWizard.svelte')
    ).default;

    render(WorkflowWizard, {
      props: { projectId: 'proj-1' }
    });

    // Navigate to step 2 (agents) -- fill name first
    const nameInput = screen.getByLabelText(/workflow name/i);
    await fireEvent.input(nameInput, { target: { value: 'Test Workflow' } });
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    // When the agent selection step renders (agents load async via fetch)
    await waitFor(() => {
      expect(screen.getByTestId('agent-group-writing')).toBeInTheDocument();
    });

    // Then I see writing agents grouped under "Writing"
    const writingGroup = screen.getByTestId('agent-group-writing');
    expect(writingGroup.textContent).toContain('SEO Blog Writer');
    expect(writingGroup.textContent).toContain('Newsletter Writer');
  });

  /**
   * @behavior Research agents fetched from the database appear grouped
   *   under a "Research" heading on the agent selection step
   * @business_rule Research agents are visually distinct from writing agents
   */
  it('AC-001.2: Research agents load from database grouped under "Research"', async () => {
    // Given I am on the workflow agent selection step
    setupFetchRouter();

    const WorkflowWizard = (
      await import('../../lib/components/WorkflowWizard.svelte')
    ).default;

    render(WorkflowWizard, {
      props: { projectId: 'proj-1' }
    });

    // Navigate to step 2
    const nameInput = screen.getByLabelText(/workflow name/i);
    await fireEvent.input(nameInput, { target: { value: 'Test Workflow' } });
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    // When the agent selection step renders (agents load async via fetch)
    await waitFor(() => {
      expect(screen.getByTestId('agent-group-research')).toBeInTheDocument();
    });

    // Then I see research agents grouped under "Research"
    const researchGroup = screen.getByTestId('agent-group-research');
    expect(researchGroup.textContent).toContain('Market Researcher');
    expect(researchGroup.textContent).toContain('Competitor Tracker');
  });

  /**
   * @behavior No hardcoded/generic agents are shown; only user-created agents
   *   from the database appear in the selection list
   * @business_rule Agents must come from the user's configured set, not from
   *   a static list baked into the client code
   */
  it('AC-001.3: No hardcoded agents shown', async () => {
    // Given I am on the workflow agent selection step
    setupFetchRouter();

    const WorkflowWizard = (
      await import('../../lib/components/WorkflowWizard.svelte')
    ).default;

    render(WorkflowWizard, {
      props: { projectId: 'proj-1' }
    });

    // Navigate to step 2
    const nameInput = screen.getByLabelText(/workflow name/i);
    await fireEvent.input(nameInput, { target: { value: 'Test Workflow' } });
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    // Wait for agents to load
    await waitFor(() => {
      expect(screen.getByText('SEO Blog Writer')).toBeInTheDocument();
    });

    // When I view available agents
    // Then none of the old hardcoded agents are present
    const hardcodedLabels = [
      'Topic Queue',
      'Variety Engine',
      'SEO Writer',
      'Ghost Publisher',
      'Postbridge Publisher',
      'Email Publisher',
      'Content Reviewer',
      'Research Agent',
      'Programmatic Page'
    ];

    for (const label of hardcodedLabels) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }

    // And the user-created agents ARE shown
    expect(screen.getByText('SEO Blog Writer')).toBeInTheDocument();
    expect(screen.getByText('Market Researcher')).toBeInTheDocument();
  });

  /**
   * @behavior When no agents exist, the agent selection step shows an empty
   *   state prompting the user to create agents first
   * @business_rule Users cannot build a workflow without agents; provide a
   *   clear path to agent creation
   */
  it('AC-001.4: Empty state when no agents exist', async () => {
    // Given I have no writing or research agents configured
    setupFetchRouter({ agents: [] });

    const WorkflowWizard = (
      await import('../../lib/components/WorkflowWizard.svelte')
    ).default;

    render(WorkflowWizard, {
      props: { projectId: 'proj-1' }
    });

    // Navigate to step 2
    const nameInput = screen.getByLabelText(/workflow name/i);
    await fireEvent.input(nameInput, { target: { value: 'Test Workflow' } });
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    // When I reach the agent selection step (wait for fetch to complete)
    await waitFor(() => {
      expect(screen.getByTestId('agents-empty-state')).toBeInTheDocument();
    });

    // Then I see an empty state prompting me to create agents
    const emptyState = screen.getByTestId('agents-empty-state');
    expect(emptyState.textContent).toMatch(/create.*agent/i);
  });

  /**
   * @behavior Multiple agents can be selected and they appear in the
   *   workflow steps list
   * @business_rule A workflow can contain multiple steps, each backed by
   *   a different user-created agent
   */
  it('AC-001.5: Select multiple agents', async () => {
    // Given I see my available agents
    setupFetchRouter();

    const WorkflowWizard = (
      await import('../../lib/components/WorkflowWizard.svelte')
    ).default;

    render(WorkflowWizard, {
      props: { projectId: 'proj-1' }
    });

    // Navigate to step 2
    const nameInput = screen.getByLabelText(/workflow name/i);
    await fireEvent.input(nameInput, { target: { value: 'Test Workflow' } });
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    // Wait for agents to load
    await waitFor(() => {
      expect(screen.getByText('SEO Blog Writer')).toBeInTheDocument();
    });

    // When I click to select multiple agents
    const writerCard = screen.getByText('SEO Blog Writer').closest('[data-testid="agent-card"]')!;
    const researcherCard = screen.getByText('Market Researcher').closest('[data-testid="agent-card"]')!;

    await fireEvent.click(writerCard);
    await fireEvent.click(researcherCard);

    // Then I can select multiple agents and they appear in my workflow steps
    const selectedItems = screen.getAllByTestId('selected-agent-item');
    expect(selectedItems).toHaveLength(2);
    expect(selectedItems[0].textContent).toContain('SEO Blog Writer');
    expect(selectedItems[1].textContent).toContain('Market Researcher');
  });
});

// ===========================================================================
// US-002: Configure Each Agent Inline
// ===========================================================================

describe('US-002 -- Configure Each Agent Inline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    setupFetchRouter();
  });

  /**
   * @behavior Each selected agent shows a topic selector populated from the
   *   user's topics in the database
   * @business_rule Agents need to know which topic to work on; topics come
   *   from the user's configured topic list
   */
  it('AC-002.1: Per-agent topic assignment', async () => {
    // Given I have selected agents for my workflow
    const WorkflowWizard = (
      await import('../../lib/components/WorkflowWizard.svelte')
    ).default;

    render(WorkflowWizard, {
      props: { projectId: 'proj-1' }
    });

    // Navigate to step 2 and select an agent
    const nameInput = screen.getByLabelText(/workflow name/i);
    await fireEvent.input(nameInput, { target: { value: 'Test Workflow' } });
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    await waitFor(() => {
      expect(screen.getByText('SEO Blog Writer')).toBeInTheDocument();
    });

    const writerCard = screen.getByText('SEO Blog Writer').closest('[data-testid="agent-card"]')!;
    await fireEvent.click(writerCard);
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    // When I reach the configure step (topics load async via fetch)
    // Wait for topics to actually populate (not just the select element)
    await waitFor(() => {
      const topicSelector = screen.getByTestId('agent-topic-select-agent-w1');
      const options = topicSelector.querySelectorAll('option');
      const optionTexts = Array.from(options).map((o) => o.textContent);
      expect(optionTexts).toContain('SaaS Marketing');
    });

    // Then each agent shows a topic selector populated from my user-created topics
    const topicSelector = screen.getByTestId('agent-topic-select-agent-w1');
    const options = topicSelector.querySelectorAll('option');
    const optionTexts = Array.from(options).map((o) => o.textContent);
    expect(optionTexts).toContain('SaaS Marketing');
    expect(optionTexts).toContain('Developer Tools');
  });

  /**
   * @behavior Each selected agent shows a destination selector populated
   *   from the user's configured destinations
   * @business_rule Each agent step needs to know where to publish output
   */
  it('AC-002.2: Per-agent destination assignment', async () => {
    // Given I have selected agents for my workflow
    const WorkflowWizard = (
      await import('../../lib/components/WorkflowWizard.svelte')
    ).default;

    render(WorkflowWizard, {
      props: { projectId: 'proj-1' }
    });

    // Navigate to step 2 and select an agent
    const nameInput = screen.getByLabelText(/workflow name/i);
    await fireEvent.input(nameInput, { target: { value: 'Test Workflow' } });
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    await waitFor(() => {
      expect(screen.getByText('SEO Blog Writer')).toBeInTheDocument();
    });

    const writerCard = screen.getByText('SEO Blog Writer').closest('[data-testid="agent-card"]')!;
    await fireEvent.click(writerCard);
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    // When I reach the configure step (destinations load async via fetch)
    // Wait for destinations to actually populate
    await waitFor(() => {
      const destSelector = screen.getByTestId('agent-destination-select-agent-w1');
      const options = destSelector.querySelectorAll('option');
      const optionTexts = Array.from(options).map((o) => o.textContent);
      expect(optionTexts).toContain('Ghost CMS');
    });

    // Then each agent shows a destination selector populated from my configured destinations
    const destSelector = screen.getByTestId('agent-destination-select-agent-w1');
    const options = destSelector.querySelectorAll('option');
    const optionTexts = Array.from(options).map((o) => o.textContent);
    expect(optionTexts).toContain('Ghost CMS');
    expect(optionTexts).toContain('Postbridge');
  });
});

// ===========================================================================
// US-003: Human-Friendly Schedule Picker
// ===========================================================================

describe('US-003 -- Human-Friendly Schedule Picker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    setupFetchRouter();
  });

  /**
   * Helper: renders the wizard and navigates to the schedule step (step 4).
   */
  async function navigateToScheduleStep() {
    const WorkflowWizard = (
      await import('../../lib/components/WorkflowWizard.svelte')
    ).default;

    render(WorkflowWizard, {
      props: { projectId: 'proj-1' }
    });

    // Step 1: name
    const nameInput = screen.getByLabelText(/workflow name/i);
    await fireEvent.input(nameInput, { target: { value: 'Test Workflow' } });
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    // Step 2: select an agent (wait for async fetch)
    await waitFor(() => {
      expect(screen.getByText('SEO Blog Writer')).toBeInTheDocument();
    });
    const agentCard = screen.getByText('SEO Blog Writer').closest('[data-testid="agent-card"]')!;
    await fireEvent.click(agentCard);
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    // Step 3: config -- wait for topics/destinations to load, then select them
    await waitFor(() => {
      const topicSelector = screen.getByTestId('agent-topic-select-agent-w1');
      const options = topicSelector.querySelectorAll('option');
      expect(options.length).toBeGreaterThan(1);
    });
    const topicSelect = screen.getByTestId('agent-topic-select-agent-w1') as HTMLSelectElement;
    await fireEvent.change(topicSelect, { target: { value: 'topic-1' } });
    const destSelect = screen.getByTestId('agent-destination-select-agent-w1') as HTMLSelectElement;
    await fireEvent.change(destSelect, { target: { value: 'dest-1' } });
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    // Now on step 4: schedule
  }

  /**
   * @behavior The schedule step shows human-readable preset options:
   *   Daily, Every weekday, Weekly, Monthly
   * @business_rule Users should not need to understand cron syntax to
   *   schedule a workflow
   */
  it('AC-003.1: Preset schedule options (Daily, Every weekday, Weekly, Monthly)', async () => {
    // Given I am on the schedule step
    await navigateToScheduleStep();

    // When I view schedule options
    // Then I see presets: Daily, Every weekday, Weekly, Monthly
    expect(screen.getByTestId('schedule-preset-daily')).toBeInTheDocument();
    expect(screen.getByTestId('schedule-preset-weekday')).toBeInTheDocument();
    expect(screen.getByTestId('schedule-preset-weekly')).toBeInTheDocument();
    expect(screen.getByTestId('schedule-preset-monthly')).toBeInTheDocument();
  });

  /**
   * @behavior Selecting "Custom" reveals a frequency builder where users
   *   can set "Every X days/times per day/week/month"
   * @business_rule Power users need fine-grained scheduling without raw cron
   */
  it('AC-003.2: Custom frequency builder', async () => {
    // Given I want a non-preset schedule
    await navigateToScheduleStep();

    // When I select custom
    const customOption = screen.getByTestId('schedule-preset-custom');
    await fireEvent.click(customOption);

    // Then I can set custom frequency
    const frequencyInput = screen.getByTestId('schedule-custom-frequency');
    expect(frequencyInput).toBeInTheDocument();

    const unitSelect = screen.getByTestId('schedule-custom-unit');
    expect(unitSelect).toBeInTheDocument();

    const unitOptions = unitSelect.querySelectorAll('option');
    const unitTexts = Array.from(unitOptions).map((o) => o.textContent);
    expect(unitTexts).toContain('days');
    expect(unitTexts).toContain('weeks');
    expect(unitTexts).toContain('months');
  });

  /**
   * @behavior The schedule picker converts human-readable selections
   *   to a valid cron expression when the workflow is saved
   * @business_rule The backend expects cron format; the UI translates
   *   human-friendly picks into cron under the hood
   */
  it('AC-003.4: Converts to cron under the hood', async () => {
    // Given I have selected a schedule via the picker
    await navigateToScheduleStep();

    // Select "Daily" preset
    await fireEvent.click(screen.getByTestId('schedule-preset-daily'));

    // Navigate to final step and save
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    await fireEvent.click(screen.getByTestId('wizard-save-btn'));

    // When the workflow is saved
    // Then the schedule is stored as a valid cron expression
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/workflows',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringMatching(/"schedule":"[0-9*/ ]{5,}"/)
        })
      );
    });
  });

  /**
   * @behavior Toggling "Manual only" clears the schedule so the workflow
   *   runs only on demand
   * @business_rule Users who want manual control should not have a cron
   *   schedule attached to their workflow
   */
  it('AC-003.5: Manual only toggle', async () => {
    // Given I do not want automatic scheduling
    await navigateToScheduleStep();

    // When I toggle "Manual only"
    const manualToggle = screen.getByTestId('schedule-manual-toggle');
    await fireEvent.click(manualToggle);

    // Then the schedule presets are hidden/disabled
    expect(screen.queryByTestId('schedule-preset-daily')).toSatisfy(
      (el: Element | null) => el === null || (el as HTMLElement).getAttribute('aria-disabled') === 'true'
    );

    // Navigate to final step and save
    await fireEvent.click(screen.getByTestId('wizard-next-btn'));

    await fireEvent.click(screen.getByTestId('wizard-save-btn'));

    // Then no cron schedule is saved
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/workflows',
        expect.objectContaining({
          body: expect.stringContaining('"schedule":null')
        })
      );
    });
  });

  /**
   * @behavior Each workflow card on the list page shows "Next run: [date/time]"
   *   when a schedule is active
   * @business_rule Users need to know when their workflow will next execute
   *   without opening the detail page
   */
  it('AC-003.6: Next scheduled run on workflow card', async () => {
    cleanup();

    const WorkflowsPage = (
      await import('../../routes/dashboard/workflows/+page.svelte')
    ).default;

    const scheduledWorkflow = {
      id: 'pipe-1',
      project_id: 'proj-1',
      name: 'Daily Blog Posts',
      description: null,
      schedule: '0 9 * * *',
      review_mode: 'draft_for_review' as const,
      is_active: true,
      steps: [{ agentType: 'seo_writer', config: {} }],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      last_run_at: '2025-06-01T09:00:00Z'
    };

    // Given a workflow has an active schedule
    render(WorkflowsPage, {
      props: { data: { pipelines: [scheduledWorkflow] } }
    });

    // When I view the workflow list
    // Then each workflow card shows "Next run: [date/time]"
    const nextRunIndicator = screen.getByTestId('workflow-next-run');
    expect(nextRunIndicator).toBeInTheDocument();
    expect(nextRunIndicator.textContent).toMatch(/next run/i);
  });
});

// ===========================================================================
// US-004: Running Workflow Status Badge
// ===========================================================================

describe('US-004 -- Running Workflow Status Badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] })
    });
  });

  /**
   * @behavior When a workflow is currently executing, its card on the list
   *   page shows a "Running" badge with step progress (e.g., "Step 2/5")
   * @business_rule Users must see at a glance which workflows are in
   *   progress and how far along they are
   */
  it('AC-004.1: Running badge on workflow list with step progress', async () => {
    const WorkflowsPage = (
      await import('../../routes/dashboard/workflows/+page.svelte')
    ).default;

    const runningWorkflow = {
      id: 'pipe-running',
      project_id: 'proj-1',
      name: 'Running Workflow',
      description: null,
      schedule: null,
      review_mode: 'draft_for_review' as const,
      is_active: true,
      steps: [
        { agentType: 'seo_writer', config: {} },
        { agentType: 'ghost_publisher', config: {} },
        { agentType: 'email_publisher', config: {} }
      ],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      last_run_at: '2025-06-01T09:00:00Z',
      current_run: {
        id: 'run-1',
        status: 'running' as const,
        current_step: 2,
        total_steps: 3
      }
    };

    // Given a workflow is currently executing
    render(WorkflowsPage, {
      props: { data: { pipelines: [runningWorkflow] } }
    });

    // When I view the workflow list
    // Then that workflow shows a "Running" badge with step progress
    const runningBadge = screen.getByTestId('workflow-running-badge');
    expect(runningBadge).toBeInTheDocument();
    expect(runningBadge.textContent).toMatch(/running/i);
    expect(runningBadge.textContent).toMatch(/step 2\/3/i);
  });
});

// ===========================================================================
// US-005: Workflow Run Logs on Detail Page
// ===========================================================================

describe('US-005 -- Workflow Run Logs on Detail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  /**
   * @behavior Clicking a run in the history table expands it to show each
   *   step: agent name, status, duration, and log output
   * @business_rule Users need visibility into what happened during each
   *   workflow execution for debugging and auditing
   */
  it('AC-005.1: Expandable run log showing step details', async () => {
    const WorkflowDetailPage = (
      await import('../../routes/dashboard/workflows/[id]/+page.svelte')
    ).default;

    const workflow = {
      id: 'pipe-1',
      project_id: 'proj-1',
      name: 'SEO Pipeline',
      description: null,
      schedule: '0 9 * * *',
      review_mode: 'draft_for_review' as const,
      is_active: true,
      steps: [
        { agentType: 'seo_writer', config: {} },
        { agentType: 'ghost_publisher', config: {} }
      ],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      last_run_at: '2025-06-01T09:00:00Z'
    };

    const runs = [
      {
        id: 'run-1',
        pipeline_id: 'pipe-1',
        status: 'completed' as const,
        current_step: 2,
        total_steps: 2,
        started_at: '2025-06-01T09:00:00Z',
        completed_at: '2025-06-01T09:05:30Z',
        result: null,
        error: null,
        bullmq_job_id: 'job-1',
        created_at: '2025-06-01T09:00:00Z',
        steps: [
          {
            agent_name: 'SEO Writer',
            status: 'completed',
            started_at: '2025-06-01T09:00:00Z',
            completed_at: '2025-06-01T09:03:00Z',
            log: 'Generated article: "10 Tips for SaaS Growth"'
          },
          {
            agent_name: 'Ghost Publisher',
            status: 'completed',
            started_at: '2025-06-01T09:03:00Z',
            completed_at: '2025-06-01T09:05:30Z',
            log: 'Published to Ghost CMS successfully'
          }
        ]
      }
    ];

    // Given I am on a workflow detail page
    render(WorkflowDetailPage, {
      props: { data: { workflow, resolvedSteps: [], runs, events: [] } }
    });

    // When I click on a run in the history
    const runRow = screen.getByTestId('run-history-row');
    await fireEvent.click(runRow);

    // Then it expands to show each step: agent name, status, duration, log output
    const stepDetails = screen.getAllByTestId('run-step-detail');
    expect(stepDetails).toHaveLength(2);

    expect(stepDetails[0].textContent).toContain('SEO Writer');
    expect(stepDetails[0].textContent).toContain('completed');
    expect(stepDetails[0].textContent).toContain('Generated article');

    expect(stepDetails[1].textContent).toContain('Ghost Publisher');
    expect(stepDetails[1].textContent).toContain('Published to Ghost CMS');
  });
});

// ===========================================================================
// US-006: Bottom Notification Ticker
// ===========================================================================

describe('US-006 -- Bottom Notification Ticker for Workflow Logs', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    cleanup();

    // Reset events store singleton between tests
    try {
      const { resetEventsStore } = await import('../../lib/stores/events.js');
      resetEventsStore();
    } catch {
      // Store may not have reset function yet
    }
  });

  /**
   * @behavior When a workflow starts executing and produces log lines, those
   *   lines appear in the bottom notification ticker with animated transitions
   * @business_rule Users need ambient visibility into workflow execution
   *   regardless of which page they are on
   */
  it('AC-006.1: Ticker activates during workflow run', async () => {
    // Set up mock data for a workflow log event
    const workflowLogEvent = {
      id: 'evt-log-1',
      project_id: 'proj-1',
      event_type: 'pipeline.step.log',
      description: '[SEO Pipeline] Step 1: Generating article...',
      metadata: { pipeline_id: 'pipe-1', step: 1 },
      is_read: false,
      created_at: new Date().toISOString()
    };

    const mockLimitReturn = { data: [workflowLogEvent], error: null };
    const mockOrderReturn = { limit: vi.fn().mockReturnValue(mockLimitReturn) };
    const mockSelectReturn = { order: vi.fn().mockReturnValue(mockOrderReturn) };
    const mockFromReturn = { select: vi.fn().mockReturnValue(mockSelectReturn) };

    mockSupabaseClient.from.mockReturnValue(mockFromReturn);

    const CommandTicker = (
      await import('../../lib/components/CommandTicker.svelte')
    ).default;

    // Given a workflow starts executing
    render(CommandTicker);

    // When log lines are produced
    // Then they appear in the bottom notification ticker
    await waitFor(() => {
      const ticker = screen.getByTestId('ticker');
      expect(ticker.textContent).toContain('Generating article');
    });

    // And the ticker-text element exists for animated transitions
    // (animation class triggers on subsequent events, not initial load)
    const tickerText = screen.getByTestId('ticker-text');
    expect(tickerText).toBeInTheDocument();
  });

  /**
   * @behavior Clicking to expand or dragging to resize the ticker grows it
   *   to show more log lines
   * @business_rule Power users want to see a full log view without navigating
   *   to the workflow detail page
   */
  it('AC-006.2: Ticker is expandable', async () => {
    const mockLimitReturn = { data: [], error: null };
    const mockOrderReturn = { limit: vi.fn().mockReturnValue(mockLimitReturn) };
    const mockSelectReturn = { order: vi.fn().mockReturnValue(mockOrderReturn) };
    const mockFromReturn = { select: vi.fn().mockReturnValue(mockSelectReturn) };

    mockSupabaseClient.from.mockReturnValue(mockFromReturn);

    const CommandTicker = (
      await import('../../lib/components/CommandTicker.svelte')
    ).default;

    render(CommandTicker);

    await waitFor(() => {
      expect(screen.getByTestId('ticker')).toBeInTheDocument();
    });

    // Given the ticker is showing
    // When I click to expand
    const expandButton = screen.getByTestId('ticker-expand-btn');
    await fireEvent.click(expandButton);

    // Then the ticker grows to show more lines
    const ticker = screen.getByTestId('ticker');
    expect(ticker.className).toContain('expanded');
  });
});

// ===========================================================================
// US-007: Fix Research Query Save Button
// ===========================================================================

describe('US-007 -- Fix Research Query Save Button', () => {
  let mockResearchStore: {
    queries: Array<{
      id: string;
      name: string;
      status: string;
      provider_chain: Array<{ provider: string; role: string }>;
      schedule: string | null;
      last_run_at: string | null;
      brief_count: number;
      pipeline_name: string | null;
    }>;
    loading: boolean;
    searchTerm: string;
    providerFilter: string | null;
    loadQueries: ReturnType<typeof vi.fn>;
    searchQueries: ReturnType<typeof vi.fn>;
    filterByProvider: ReturnType<typeof vi.fn>;
    filterByStatus: ReturnType<typeof vi.fn>;
    runQuery: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();

    mockResearchStore = {
      queries: [],
      loading: false,
      searchTerm: '',
      providerFilter: null,
      loadQueries: vi.fn(),
      searchQueries: vi.fn(),
      filterByProvider: vi.fn(),
      filterByStatus: vi.fn(),
      runQuery: vi.fn()
    };
  });

  /**
   * @behavior Clicking the save button after entering a name sends a POST
   *   request to /api/v1/research and creates the research query
   * @business_rule Research queries must persist in the database so they
   *   can be scheduled and run later
   */
  it('AC-007.1: Save creates research query', async () => {
    // Given I have entered a name for a new research query
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'rq-new', name: 'AI Trends' } })
    });

    const ResearchPage = (
      await import('../../routes/dashboard/research/+page.svelte')
    ).default;

    render(ResearchPage);

    // Open new query form
    const newQueryBtn = screen.getByTestId('new-query-btn');
    await fireEvent.click(newQueryBtn);

    // Enter query name
    const nameInput = screen.getByTestId('new-query-name-input');
    await fireEvent.input(nameInput, { target: { value: 'AI Trends' } });

    // When I click the save button
    const saveBtn = screen.getByTestId('new-query-save-btn');
    await fireEvent.click(saveBtn);

    // Then a POST request is sent to /api/v1/research
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/research',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('AI Trends')
        })
      );
    });
  });

  /**
   * @behavior After a successful save, the research query list refreshes
   *   to include the newly created query
   * @business_rule Users need immediate confirmation that their query was
   *   created -- the list should update without a manual page refresh
   */
  it('AC-007.2: List refreshes after save', async () => {
    // Given I have successfully saved a new query
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'rq-new', name: 'AI Trends' } })
    });

    const ResearchPage = (
      await import('../../routes/dashboard/research/+page.svelte')
    ).default;

    render(ResearchPage);

    // Track supabase calls before save
    const callCountBefore = mockSupabaseClient.from.mock.calls.length;

    const newQueryBtn = screen.getByTestId('new-query-btn');
    await fireEvent.click(newQueryBtn);

    const nameInput = screen.getByTestId('new-query-name-input');
    await fireEvent.input(nameInput, { target: { value: 'AI Trends' } });

    const saveBtn = screen.getByTestId('new-query-save-btn');
    await fireEvent.click(saveBtn);

    // When the save completes
    // Then the research query list refreshes (loadQueries calls supabase.from again)
    await waitFor(() => {
      // After successful save, loadQueries is called again, resulting in more supabase.from calls
      expect(mockSupabaseClient.from.mock.calls.length).toBeGreaterThan(callCountBefore);
    });
  });

  /**
   * @behavior When the save request fails, an error message is shown and
   *   the user can retry
   * @business_rule Users need to know when something went wrong so they
   *   can take corrective action
   */
  it('AC-007.3: Error handling on save failure', async () => {
    // Given the save request fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Internal Server Error' })
    });

    const ResearchPage = (
      await import('../../routes/dashboard/research/+page.svelte')
    ).default;

    render(ResearchPage);

    // Open form and fill name
    const newQueryBtn = screen.getByTestId('new-query-btn');
    await fireEvent.click(newQueryBtn);

    const nameInput = screen.getByTestId('new-query-name-input');
    await fireEvent.input(nameInput, { target: { value: 'Failing Query' } });

    // When I click save
    const saveBtn = screen.getByTestId('new-query-save-btn');
    await fireEvent.click(saveBtn);

    // Then I see an error message
    await waitFor(() => {
      const errorMessage = screen.getByTestId('new-query-save-error');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage.textContent).toMatch(/error|failed/i);
    });

    // And the form is still visible so I can retry
    expect(screen.getByTestId('new-query-form')).toBeInTheDocument();
    expect(screen.getByTestId('new-query-save-btn')).toBeInTheDocument();
  });
});
