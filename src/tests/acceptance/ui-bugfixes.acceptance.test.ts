/**
 * Acceptance tests for UI bug fixes.
 *
 * These tests are written RED-first: they describe the CORRECT behavior
 * that should exist after each bug is fixed. They will FAIL against the
 * current codebase because the bugs have not been fixed yet.
 *
 * Bug tracker:
 *  1. Settings sub-pages crash (no server loaders)
 *  2. ProjectSwitcher dropdown doesn't close on click outside
 *  3. Workflows page crash on null steps
 *  4. Destination creation dialog has no Cancel button
 *  5. Writing styles form has no Cancel button
 *  6. Integrations destination form has no Cancel button
 *  7. No Research link in Sidebar
 */
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
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

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => ({}))
}));

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn()
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn().mockReturnValue(mockChannel),
    removeChannel: vi.fn(),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({ data: [], error: null })
        })
      })
    })
  }))
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ---------------------------------------------------------------------------
// Bug #1: Settings sub-pages crash (no server loaders)
// ---------------------------------------------------------------------------

describe('Bug #1 — Settings sub-pages render without crashing', () => {
  /**
   * @behavior Integrations page renders with empty data arrays
   * @business_rule Users can navigate to integrations even when no keys or
   *   destinations have been configured yet
   */
  it('Integrations page renders with empty data', async () => {
    const IntegrationsPage = (
      await import(
        '../../routes/dashboard/settings/integrations/+page.svelte'
      )
    ).default;

    render(IntegrationsPage, {
      props: {
        data: { projectId: 'proj-1', apiKeys: [], destinations: [] }
      }
    });

    expect(screen.getByTestId('integrations-page')).toBeInTheDocument();
  });

  /**
   * @behavior Writing Styles page renders with an empty styles array
   * @business_rule Users can visit writing styles before creating any styles
   */
  it('Writing Styles page renders with empty data', async () => {
    const WritingStylesPage = (
      await import(
        '../../routes/dashboard/settings/writing-styles/+page.svelte'
      )
    ).default;

    render(WritingStylesPage, {
      props: { data: { writingStyles: [] } }
    });

    expect(screen.getByTestId('writing-styles-page')).toBeInTheDocument();
  });

  /**
   * @behavior Destinations page renders with an empty destinations array
   * @business_rule Users can visit destinations before configuring any
   */
  it('Destinations page renders with empty data', async () => {
    const DestinationsPage = (
      await import(
        '../../routes/dashboard/settings/destinations/+page.svelte'
      )
    ).default;

    render(DestinationsPage, {
      props: { data: { destinations: [] } }
    });

    expect(screen.getByTestId('destinations-page')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Bug #2: ProjectSwitcher dropdown doesn't close on click outside
// ---------------------------------------------------------------------------

describe('Bug #2 — ProjectSwitcher closes on click outside', () => {
  const twoProjects = [
    { id: 'proj-1', name: 'Alpha', icon: null, color: null },
    { id: 'proj-2', name: 'Beta', icon: null, color: null }
  ];

  let mockStorage: Storage;

  beforeEach(() => {
    const store: Record<string, string> = {};
    mockStorage = {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(),
      get length() {
        return Object.keys(store).length;
      },
      key: vi.fn((index: number) => Object.keys(store)[index] ?? null)
    };
    vi.stubGlobal('localStorage', mockStorage);
  });

  /**
   * @behavior Clicking outside the open ProjectSwitcher dropdown closes it
   * @business_rule Dropdowns should dismiss when focus moves elsewhere so
   *   the UI does not obstruct other interactions
   */
  it('clicking outside the dropdown closes it', async () => {
    const ProjectSwitcher = (
      await import('../../lib/components/ProjectSwitcher.svelte')
    ).default;

    render(ProjectSwitcher, { props: { projects: twoProjects } });

    // Open the dropdown
    const trigger = screen.getByTestId('project-switcher-trigger');
    await fireEvent.click(trigger);

    // Dropdown should be visible
    expect(screen.getByTestId('project-switcher-dropdown')).toBeInTheDocument();

    // Click outside (document body)
    await fireEvent.mouseDown(document.body);

    // Dropdown should now be gone
    expect(
      screen.queryByTestId('project-switcher-dropdown')
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Bug #3: Workflows page crash on null steps
// ---------------------------------------------------------------------------

describe('Bug #3 — Workflows page handles null steps gracefully', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] })
    });
  });

  /**
   * @behavior Workflow list renders without crashing when a workflow has
   *   null steps (as returned from the database)
   * @business_rule A newly-created workflow may have null steps; the list
   *   page must not crash and should display "0 steps"
   */
  it('renders workflow cards when steps is null', async () => {
    const WorkflowsPage = (
      await import('../../routes/dashboard/workflows/+page.svelte')
    ).default;

    const workflowsWithNullSteps = [
      {
        id: 'pipe-null',
        project_id: 'proj-1',
        name: 'Empty Workflow',
        description: null,
        schedule: null,
        review_mode: 'draft_for_review' as const,
        is_active: true,
        steps: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        last_run_at: null
      },
      {
        id: 'pipe-undef',
        project_id: 'proj-1',
        name: 'Undefined Steps Workflow',
        description: null,
        schedule: null,
        review_mode: 'auto_publish' as const,
        is_active: false,
        steps: undefined,
        created_at: '2025-01-02T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
        last_run_at: null
      }
    ];

    // This should NOT throw
    render(WorkflowsPage, {
      props: { data: { pipelines: workflowsWithNullSteps } }
    });

    // Both cards should be present
    const workflowCards = screen.getAllByTestId('workflow-card');
    expect(workflowCards).toHaveLength(2);

    // Step count should show 0 instead of crashing
    expect(screen.getByText('Empty Workflow')).toBeInTheDocument();
    expect(screen.getByText('Undefined Steps Workflow')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Bug #4: Cannot close destination creation dialog (no Cancel button)
// ---------------------------------------------------------------------------

describe('Bug #4 — Destinations form has a Cancel button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: {} })
    });
  });

  /**
   * @behavior The destination creation form shows a Cancel button that hides
   *   the form without saving
   * @business_rule Users must be able to dismiss any form they opened
   *   without being forced to submit or reload the page
   */
  it('Cancel button hides the destination creation form', async () => {
    const DestinationsPage = (
      await import(
        '../../routes/dashboard/settings/destinations/+page.svelte'
      )
    ).default;

    render(DestinationsPage, {
      props: { data: { destinations: [] } }
    });

    // Open form
    const addBtn = screen.getByRole('button', { name: /add destination/i });
    await fireEvent.click(addBtn);

    // Form should be visible
    expect(screen.getByLabelText(/destination type/i)).toBeInTheDocument();

    // Cancel button must exist
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    expect(cancelBtn).toBeInTheDocument();

    // Clicking Cancel hides the form
    await fireEvent.click(cancelBtn);
    expect(screen.queryByLabelText(/destination type/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Bug #5: Writing styles form cannot be closed (no Cancel button)
// ---------------------------------------------------------------------------

describe('Bug #5 — Writing styles form has a Cancel button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: {} })
    });
  });

  /**
   * @behavior The writing style creation form shows a Cancel button that
   *   hides the form without saving
   * @business_rule Users must be able to dismiss any form they opened
   *   without being forced to submit or reload the page
   */
  it('Cancel button hides the writing styles form', async () => {
    const WritingStylesPage = (
      await import(
        '../../routes/dashboard/settings/writing-styles/+page.svelte'
      )
    ).default;

    render(WritingStylesPage, {
      props: { data: { writingStyles: [] } }
    });

    // Open form
    const createBtn = screen.getByRole('button', { name: /create style/i });
    await fireEvent.click(createBtn);

    // Form should be visible
    expect(screen.getByLabelText(/style name/i)).toBeInTheDocument();

    // Cancel button must exist
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    expect(cancelBtn).toBeInTheDocument();

    // Clicking Cancel hides the form
    await fireEvent.click(cancelBtn);
    expect(screen.queryByLabelText(/style name/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Bug #6: Integrations destination form cannot be closed (no Cancel button)
// ---------------------------------------------------------------------------

describe('Bug #6 — Integrations destination form has a Cancel button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: {} })
    });
  });

  /**
   * @behavior The integrations destination form shows a Cancel button that
   *   hides the form without saving
   * @business_rule Users must be able to dismiss any form they opened
   *   without being forced to submit or reload the page
   */
  it('Cancel button hides the integrations destination form', async () => {
    const IntegrationsPage = (
      await import(
        '../../routes/dashboard/settings/integrations/+page.svelte'
      )
    ).default;

    render(IntegrationsPage, {
      props: {
        data: { projectId: 'proj-1', apiKeys: [], destinations: [] }
      }
    });

    // Open destination form
    const addBtn = screen.getByRole('button', { name: /add destination/i });
    await fireEvent.click(addBtn);

    // Form should be visible
    expect(screen.getByLabelText(/destination type/i)).toBeInTheDocument();

    // Cancel button must exist
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    expect(cancelBtn).toBeInTheDocument();

    // Clicking Cancel hides the form
    await fireEvent.click(cancelBtn);
    expect(screen.queryByLabelText(/destination type/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Bug #7: No Research link in Sidebar
// ---------------------------------------------------------------------------

describe('Bug #7 — Sidebar includes a Research link', () => {
  beforeEach(() => {
    cleanup();
  });

  /**
   * @behavior Sidebar renders a Research link pointing to /dashboard/research
   * @business_rule The research feature must be discoverable from the main
   *   navigation so users can access their research workspace
   */
  it('sidebar nav contains a Research link', { timeout: 10000 }, async () => {
    const Sidebar = (
      await import('../../lib/components/Sidebar.svelte')
    ).default;

    const { container } = render(Sidebar, { props: { currentPath: '/dashboard', collapsed: false } });

    const researchLink = container.querySelector(
      'a[href="/dashboard/research"]'
    );

    expect(researchLink).not.toBeNull();
    expect(researchLink?.textContent?.trim()).toContain('Research');
  });

  /**
   * @behavior Research link highlights when currentPath matches
   * @business_rule Active nav state provides wayfinding; Research must
   *   participate in the same active-link pattern as other nav items
   */
  it('Research link is highlighted when on the research page', { timeout: 10000 }, async () => {
    const Sidebar = (
      await import('../../lib/components/Sidebar.svelte')
    ).default;

    const { container } = render(Sidebar, { props: { currentPath: '/dashboard/research', collapsed: false } });

    const researchLink = container.querySelector(
      'a[href="/dashboard/research"]'
    );

    expect(researchLink).not.toBeNull();
    expect(researchLink?.getAttribute('aria-current')).toBe('page');
  });
});
