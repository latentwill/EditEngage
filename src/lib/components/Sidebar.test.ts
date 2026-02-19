/**
 * @behavior Sidebar renders a vertical navigation menu with all dashboard links,
 * collapsible Write sub-menu, active state highlighting, icons, and utility slots.
 * @business_rule Navigation provides consistent wayfinding across all dashboard
 * pages with support for nested routes under Write.
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Sidebar from './Sidebar.svelte';

describe('Sidebar — Navigation Links', () => {
  it('should render all top-level navigation links', () => {
    render(Sidebar, { props: { currentPath: '/dashboard' } });

    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toBeInTheDocument();

    // All top-level nav links
    expect(screen.getByTestId('nav-link-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('nav-link-workflows')).toBeInTheDocument();
    expect(screen.getByTestId('nav-link-research')).toBeInTheDocument();
    expect(screen.getByTestId('nav-link-publish')).toBeInTheDocument();
    expect(screen.getByTestId('nav-link-settings')).toBeInTheDocument();
  });

  it('should render Write section with Content Library and Topics sub-items', () => {
    render(Sidebar, { props: { currentPath: '/dashboard' } });

    // Write parent item
    const writeItem = screen.getByTestId('nav-link-write');
    expect(writeItem).toBeInTheDocument();

    // Sub-items
    expect(screen.getByTestId('nav-link-write-content')).toBeInTheDocument();
    expect(screen.getByTestId('nav-link-write-topics')).toBeInTheDocument();
  });

  it('should highlight active link based on currentPath prop', () => {
    render(Sidebar, { props: { currentPath: '/dashboard/workflows' } });

    const workflowsLink = screen.getByTestId('nav-link-workflows');
    expect(workflowsLink.getAttribute('aria-current')).toBe('page');

    const dashboardLink = screen.getByTestId('nav-link-dashboard');
    expect(dashboardLink.getAttribute('aria-current')).toBeNull();
  });

  it('should auto-expand Write sub-menu when child route is active', () => {
    render(Sidebar, { props: { currentPath: '/dashboard/write/content' } });

    const writeSubmenu = screen.getByTestId('write-submenu');
    expect(writeSubmenu).toBeInTheDocument();

    // Content link should be active
    const contentLink = screen.getByTestId('nav-link-write-content');
    expect(contentLink.getAttribute('aria-current')).toBe('page');
  });

  it('should render Lucide icons for each nav item', () => {
    render(Sidebar, { props: { currentPath: '/dashboard' } });

    // Each nav item should have an icon
    const icons = screen.getAllByTestId('nav-icon');
    expect(icons.length).toBeGreaterThanOrEqual(6); // Dashboard, Workflows, Write, Research, Publish, Settings
  });

  it('should render project switcher slot area', () => {
    render(Sidebar, { props: { currentPath: '/dashboard' } });

    const projectSwitcher = screen.getByTestId('sidebar-project-switcher');
    expect(projectSwitcher).toBeInTheDocument();
  });

  it('should render theme toggle and user avatar at bottom', () => {
    render(Sidebar, { props: { currentPath: '/dashboard' } });

    const bottomSection = screen.getByTestId('sidebar-bottom');
    expect(bottomSection).toBeInTheDocument();

    const themeToggle = screen.getByTestId('sidebar-theme-toggle');
    expect(themeToggle).toBeInTheDocument();

    const avatar = screen.getByTestId('sidebar-avatar');
    expect(avatar).toBeInTheDocument();
  });
});

describe('Sidebar — Collapse/Expand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show text labels when expanded', () => {
    render(Sidebar, { props: { currentPath: '/dashboard', collapsed: false } });

    const sidebar = screen.getByTestId('sidebar');
    // Expanded sidebar should have the expanded width class
    expect(sidebar.className).toContain('w-60');

    // Nav labels should be visible
    const labels = screen.getAllByTestId('nav-label');
    labels.forEach(label => {
      expect(label.classList.contains('hidden')).toBe(false);
    });
  });

  it('should show only icons when collapsed', () => {
    render(Sidebar, { props: { currentPath: '/dashboard', collapsed: true } });

    const sidebar = screen.getByTestId('sidebar');
    // Collapsed sidebar should have the collapsed width class
    expect(sidebar.className).toContain('w-16');

    // Nav labels should be hidden
    const labels = screen.getAllByTestId('nav-label');
    labels.forEach(label => {
      expect(label.classList.contains('hidden')).toBe(true);
    });
  });

  it('should toggle collapsed state on button click', async () => {
    render(Sidebar, { props: { currentPath: '/dashboard', collapsed: false } });

    const toggleBtn = screen.getByTestId('sidebar-collapse-toggle');
    expect(toggleBtn).toBeInTheDocument();

    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar.className).toContain('w-60');

    await fireEvent.click(toggleBtn);

    expect(sidebar.className).toContain('w-16');
  });

  it('should show tooltips when collapsed', () => {
    render(Sidebar, { props: { currentPath: '/dashboard', collapsed: true } });

    // Tooltip wrappers should exist on nav items
    const tooltips = screen.getAllByTestId('nav-tooltip');
    expect(tooltips.length).toBeGreaterThanOrEqual(5);
  });
});
