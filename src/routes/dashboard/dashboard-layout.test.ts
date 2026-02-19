/**
 * @behavior Dashboard layout renders sidebar navigation instead of top nav bar,
 * with main content beside the sidebar in a horizontal flex layout.
 * @business_rule The dashboard uses a sidebar for navigation to support
 * nested routes (Write > Content/Topics) and collapsible navigation.
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import DashboardLayout from './+layout.svelte';

const defaultData = {
  projects: [],
  orgId: 'org-1',
  session: { user: { id: 'user-1', email: 'test@example.com' }, access_token: 'token-1' },
};

describe('Dashboard Layout — Sidebar Integration', () => {
  it('should render sidebar instead of top nav', () => {
    render(DashboardLayout, { props: { data: defaultData } });

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.queryByTestId('glass-nav')).not.toBeInTheDocument();
  });

  it('should render main content area beside sidebar in flex row', () => {
    render(DashboardLayout, { props: { data: defaultData } });

    const mainContent = screen.getByTestId('dashboard-main');
    expect(mainContent).toBeInTheDocument();
    expect(mainContent.classList.contains('flex-1')).toBe(true);
  });

  it('should render project switcher inside sidebar', () => {
    render(DashboardLayout, { props: { data: defaultData } });

    const sidebar = screen.getByTestId('sidebar');
    const projectSwitcher = screen.getByTestId('sidebar-project-switcher');
    expect(sidebar.contains(projectSwitcher)).toBe(true);
  });

  it('should render command ticker at bottom of main content', () => {
    render(DashboardLayout, { props: { data: defaultData } });

    const commandTicker = screen.getByTestId('command-ticker-slot');
    expect(commandTicker).toBeInTheDocument();
  });
});
