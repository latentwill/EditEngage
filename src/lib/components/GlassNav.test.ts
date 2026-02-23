/**
 * @behavior GlassNav renders a glassmorphism top navigation bar with logo,
 * nav links, theme toggle, avatar, hamburger menu, and integrated ProjectSelector
 * @business_rule Navigation provides consistent wayfinding across all dashboard pages
 * with project context available throughout
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import GlassNav from './GlassNav.svelte';

const mockStore = {
  projects: [
    {
      id: 'proj-1',
      name: 'Extndly',
      domain: 'extndly.com',
      color: '#3B82F6',
      org_id: 'org-1',
      description: null,
      icon: null,
      settings: {},
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
  ],
  favoriteProjectIds: [],
  selectedProjectId: 'all',
  loadProjects: vi.fn(),
  toggleFavorite: vi.fn(),
  selectProject: vi.fn(),
  searchProjects: vi.fn().mockReturnValue([]),
};

vi.mock('$lib/stores/projectStore', () => {
  return { createProjectStore: () => mockStore };
});

describe('GlassNav', () => {
  it('renders logo, nav links, and avatar placeholder', () => {
    render(GlassNav, { props: { currentPath: '/dashboard' } });

    const nav = screen.getByTestId('glass-nav');
    expect(nav).toBeInTheDocument();

    expect(screen.getByText('EditEngage')).toBeInTheDocument();
    expect(screen.getByTestId('avatar-placeholder')).toBeInTheDocument();
  });

  it('highlights active nav link based on currentPath prop', () => {
    render(GlassNav, { props: { currentPath: '/dashboard/feed' } });

    const links = screen.getByTestId('desktop-nav-links').querySelectorAll('a');
    const feedLink = Array.from(links).find(
      (link) => link.getAttribute('href') === '/dashboard/feed'
    );
    const dashboardLink = Array.from(links).find(
      (link) => link.getAttribute('href') === '/dashboard'
    );

    expect(feedLink?.getAttribute('aria-current')).toBe('page');
    expect(dashboardLink?.getAttribute('aria-current')).toBeNull();
  });

  it('renders hamburger menu button on mobile', () => {
    render(GlassNav, { props: { currentPath: '/dashboard' } });

    const hamburger = screen.getByTestId('hamburger-menu');
    expect(hamburger).toBeInTheDocument();
  });

  it('hamburger menu toggles nav visibility', async () => {
    render(GlassNav, { props: { currentPath: '/dashboard' } });

    const hamburger = screen.getByTestId('hamburger-menu');
    const mobileNav = screen.getByTestId('mobile-nav');

    expect(mobileNav.classList.contains('hidden')).toBe(true);

    await fireEvent.click(hamburger);
    expect(mobileNav.classList.contains('hidden')).toBe(false);

    await fireEvent.click(hamburger);
    expect(mobileNav.classList.contains('hidden')).toBe(true);
  });

  // --- New Task 6 tests ---

  it('should render ProjectSelector prominently in the nav bar', () => {
    render(GlassNav, { props: { currentPath: '/dashboard' } });

    const nav = screen.getByTestId('glass-nav');
    const projectSelector = nav.querySelector('[data-testid="project-selector-trigger"]');

    expect(projectSelector).toBeInTheDocument();
  });

  it('should update nav links to: Dashboard, Feed, Pipelines, Research, Settings', () => {
    render(GlassNav, { props: { currentPath: '/dashboard' } });

    const desktopNav = screen.getByTestId('desktop-nav-links');
    const links = desktopNav.querySelectorAll('a');

    const linkLabels = Array.from(links).map((a) => a.textContent?.trim());
    expect(linkLabels).toEqual(['Dashboard', 'Feed', 'Pipelines', 'Research', 'Settings']);
  });

  it('should pass selected project context to all child routes', () => {
    render(GlassNav, { props: { currentPath: '/dashboard' } });

    const nav = screen.getByTestId('glass-nav');
    expect(nav.getAttribute('data-selected-project')).toBe('all');
  });
});
