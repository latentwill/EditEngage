/**
 * Acceptance tests for daisyUI migration.
 *
 * These tests are written RED-first: they describe the CORRECT behavior
 * that should exist after the daisyUI migration is complete. They will
 * FAIL against the current codebase because daisyUI is not yet installed
 * and no component has been migrated to daisyUI classes.
 *
 * Migration checklist:
 *  1. Infrastructure: daisyUI configured in tailwind, package.json, app.css
 *  2. GlassNav uses daisyUI navbar + btn-ghost
 *  3. GlassCard uses daisyUI card
 *  4. ProjectSwitcher uses daisyUI dropdown + menu
 *  5. Workflow cards use daisyUI card + badge
 *  6. Settings nav uses daisyUI menu
 *  7. Form controls use daisyUI input + select classes
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

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
// Shared constants
// ---------------------------------------------------------------------------

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

// ---------------------------------------------------------------------------
// 1. Infrastructure: daisyUI is configured
// ---------------------------------------------------------------------------

describe('Infrastructure: daisyUI is configured', () => {
  /**
   * @behavior tailwind.config.ts includes daisyui in its plugins array
   * @business_rule The design system migration requires daisyUI to be
   *   registered as a Tailwind plugin so its utility classes are available
   */
  it('tailwind.config.ts contains daisyui in plugins', () => {
    const configPath = path.join(PROJECT_ROOT, 'tailwind.config.ts');
    const configContent = fs.readFileSync(configPath, 'utf-8');

    expect(configContent).toContain('daisyui');
    // Verify it appears in a plugins context (not just a comment)
    expect(configContent).toMatch(/plugins\s*:\s*\[[\s\S]*daisyui/);
  });

  /**
   * @behavior package.json lists daisyui as a devDependency
   * @business_rule daisyUI must be declared as a project dependency so
   *   it is installed in CI and local environments
   */
  it('package.json has daisyui in devDependencies', () => {
    const pkgPath = path.join(PROJECT_ROOT, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    expect(pkg.devDependencies).toHaveProperty('daisyui');
  });

  /**
   * @behavior app.css no longer defines the --glass-bg CSS variable
   * @business_rule After migration, glass design tokens are replaced by
   *   daisyUI theme tokens; keeping the old variables would cause confusion
   */
  it('app.css does not contain --glass-bg variable', () => {
    const cssPath = path.join(PROJECT_ROOT, 'src', 'app.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    expect(cssContent).not.toContain('--glass-bg');
  });
});

// ---------------------------------------------------------------------------
// 2. GlassNav uses daisyUI navbar
// ---------------------------------------------------------------------------

describe('GlassNav uses daisyUI navbar', () => {
  /**
   * @behavior GlassNav renders a nav element with the daisyUI `navbar` class
   * @business_rule The navigation bar must use the daisyUI navbar component
   *   for consistent theming and responsive behavior
   */
  it('nav element has the navbar class', async () => {
    const GlassNav = (
      await import('../../lib/components/GlassNav.svelte')
    ).default;

    render(GlassNav, { props: { currentPath: '/dashboard' } });

    const nav = screen.getByTestId('glass-nav');
    expect(nav.classList.contains('navbar')).toBe(true);
  });

  /**
   * @behavior Nav links use the daisyUI btn btn-ghost pattern
   * @business_rule Navigation links must use daisyUI button-ghost styling
   *   for consistent hover/focus states across the design system
   */
  it('nav links use btn btn-ghost classes', async () => {
    const GlassNav = (
      await import('../../lib/components/GlassNav.svelte')
    ).default;

    render(GlassNav, { props: { currentPath: '/dashboard' } });

    const desktopNav = screen.getByTestId('desktop-nav-links');
    const links = desktopNav.querySelectorAll('a');

    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => {
      expect(link.classList.contains('btn')).toBe(true);
      expect(link.classList.contains('btn-ghost')).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// 3. GlassCard uses daisyUI card
// ---------------------------------------------------------------------------

describe('GlassCard uses daisyUI card', () => {
  /**
   * @behavior GlassCard renders with the daisyUI `card` class
   * @business_rule All card containers must use daisyUI card for consistent
   *   elevation, padding, and border-radius across the application
   */
  it('container has the card class', async () => {
    const GlassCard = (
      await import('../../lib/components/GlassCard.svelte')
    ).default;

    const { container } = render(GlassCard);

    const card = container.querySelector('[data-testid="glass-card"]');
    expect(card).not.toBeNull();
    expect(card!.classList.contains('card')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. ProjectSwitcher uses daisyUI dropdown
// ---------------------------------------------------------------------------

describe('ProjectSwitcher uses daisyUI dropdown', () => {
  const projects = [
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
   * @behavior ProjectSwitcher wrapper has the daisyUI `dropdown` class
   * @business_rule The project switcher must use daisyUI dropdown for
   *   consistent open/close behavior and positioning
   */
  it('wrapper element has dropdown class', async () => {
    const ProjectSwitcher = (
      await import('../../lib/components/ProjectSwitcher.svelte')
    ).default;

    const { container } = render(ProjectSwitcher, {
      props: { projects }
    });

    const wrapper = container.firstElementChild;
    expect(wrapper).not.toBeNull();
    expect(wrapper!.classList.contains('dropdown')).toBe(true);
  });

  /**
   * @behavior Opened dropdown content uses the daisyUI `menu` class
   * @business_rule Dropdown lists must use daisyUI menu for consistent
   *   item spacing, hover states, and keyboard navigation
   */
  it('dropdown content uses menu class', async () => {
    const ProjectSwitcher = (
      await import('../../lib/components/ProjectSwitcher.svelte')
    ).default;

    render(ProjectSwitcher, { props: { projects } });

    const trigger = screen.getByTestId('project-switcher-trigger');
    await fireEvent.click(trigger);

    const dropdown = screen.getByTestId('project-switcher-dropdown');
    // The dropdown content or its list child should have the menu class
    const menuElement =
      dropdown.classList.contains('menu')
        ? dropdown
        : dropdown.querySelector('.menu');

    expect(menuElement).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. Workflow cards use daisyUI card and badge
// ---------------------------------------------------------------------------

describe('Workflow cards use daisyUI card and badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] })
    });
  });

  const workflows = [
    {
      id: 'pipe-1',
      project_id: 'proj-1',
      name: 'SEO Writer',
      description: null,
      schedule: null,
      review_mode: 'draft_for_review' as const,
      is_active: true,
      steps: [{ agentType: 'writer', config: {} }],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      last_run_at: null
    }
  ];

  /**
   * @behavior Workflow cards render with the daisyUI `card` class
   * @business_rule Workflow list items must use daisyUI card for visual
   *   consistency with other card-based layouts in the app
   */
  it('workflow cards have the card class', async () => {
    const WorkflowsPage = (
      await import('../../routes/dashboard/workflows/+page.svelte')
    ).default;

    render(WorkflowsPage, {
      props: { data: { pipelines: workflows } }
    });

    const cards = screen.getAllByTestId('workflow-card');
    expect(cards.length).toBeGreaterThan(0);
    cards.forEach((card) => {
      expect(card.classList.contains('card')).toBe(true);
    });
  });

  /**
   * @behavior Workflow status badges render with the daisyUI `badge` class
   * @business_rule Status indicators must use daisyUI badge for consistent
   *   sizing, colors, and rounded-pill styling
   */
  it('status badges have the badge class', async () => {
    const WorkflowsPage = (
      await import('../../routes/dashboard/workflows/+page.svelte')
    ).default;

    render(WorkflowsPage, {
      props: { data: { pipelines: workflows } }
    });

    const badges = screen.getAllByTestId('workflow-status-badge');
    expect(badges.length).toBeGreaterThan(0);
    badges.forEach((badge) => {
      expect(badge.classList.contains('badge')).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// 6. Settings nav uses daisyUI menu
// ---------------------------------------------------------------------------

describe('Settings nav uses daisyUI menu', () => {
  /**
   * @behavior Settings navigation renders with the daisyUI `menu` class
   * @business_rule Settings sidebar navigation must use daisyUI menu
   *   for consistent item spacing, active states, and keyboard navigation
   */
  it('settings nav has the menu class', async () => {
    const SettingsLayout = (
      await import('../../routes/dashboard/settings/+layout.svelte')
    ).default;

    render(SettingsLayout, { props: { data: { projectId: 'p1', currentPath: '/dashboard/settings' } } });

    const nav = screen.getByTestId('settings-sub-nav');
    expect(nav.classList.contains('menu')).toBe(true);
  }, 15000);
});

// ---------------------------------------------------------------------------
// 7. Form controls use daisyUI classes
// ---------------------------------------------------------------------------

describe('Form controls use daisyUI classes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: {} })
    });
  });

  /**
   * @behavior Writing styles form inputs use the daisyUI `input` class
   * @business_rule All text inputs must use daisyUI input for consistent
   *   sizing, focus rings, and theme-aware styling
   */
  it('text inputs have the input class', async () => {
    const WritingStylesPage = (
      await import(
        '../../routes/dashboard/settings/writing-styles/+page.svelte'
      )
    ).default;

    render(WritingStylesPage, {
      props: { data: { writingStyles: [] } }
    });

    // Open the form
    const createBtn = screen.getByRole('button', { name: /create style/i });
    await fireEvent.click(createBtn);

    // All text inputs in the form should have the daisyUI input class
    const styleNameInput = document.getElementById('style-name') as HTMLInputElement;
    expect(styleNameInput).not.toBeNull();
    expect(styleNameInput.classList.contains('input')).toBe(true);

    const avoidInput = document.getElementById('style-avoid') as HTMLInputElement;
    expect(avoidInput).not.toBeNull();
    expect(avoidInput.classList.contains('input')).toBe(true);
  });

  /**
   * @behavior Writing styles form selects use the daisyUI `select` class
   * @business_rule All select dropdowns must use daisyUI select for consistent
   *   styling with the rest of the form controls
   */
  it('select elements have the select class', async () => {
    const WritingStylesPage = (
      await import(
        '../../routes/dashboard/settings/writing-styles/+page.svelte'
      )
    ).default;

    render(WritingStylesPage, {
      props: { data: { writingStyles: [] } }
    });

    // Open the form
    const createBtn = screen.getByRole('button', { name: /create style/i });
    await fireEvent.click(createBtn);

    // The tone select should have the daisyUI select class
    const toneSelect = document.getElementById('style-tone') as HTMLSelectElement;
    expect(toneSelect).not.toBeNull();
    expect(toneSelect.classList.contains('select')).toBe(true);
  });
});
