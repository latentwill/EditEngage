/**
 * @behavior Settings layout provides persistent sub-navigation across all settings sub-pages.
 * @business_rule Users can navigate between General and Connections settings without
 *   losing the sub-navigation menu. Active page is highlighted.
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => ({}))
}));

describe('Settings Layout — Persistent Sub-Nav', () => {
  it('renders sub-nav with General and Connections links', { timeout: 15000 }, async () => {
    const SettingsLayout = (
      await import('./+layout.svelte')
    ).default;

    render(SettingsLayout, {
      props: { data: { projectId: 'proj-1' } }
    });

    const nav = screen.getByTestId('settings-sub-nav');
    expect(nav).toBeInTheDocument();

    const generalLink = nav.querySelector('a[href="/dashboard/settings"]');
    expect(generalLink).not.toBeNull();
    expect(generalLink?.textContent?.trim()).toContain('General');

    const connectionsLink = nav.querySelector('a[href="/dashboard/settings/connections"]');
    expect(connectionsLink).not.toBeNull();
    expect(connectionsLink?.textContent?.trim()).toContain('Connections');
  });

  it('highlights active sub-page based on data.currentPath', { timeout: 15000 }, async () => {
    const SettingsLayout = (
      await import('./+layout.svelte')
    ).default;

    render(SettingsLayout, {
      props: { data: { projectId: 'proj-1', currentPath: '/dashboard/settings/connections' } }
    });

    const nav = screen.getByTestId('settings-sub-nav');
    const connectionsLink = nav.querySelector('a[href="/dashboard/settings/connections"]');
    expect(connectionsLink?.getAttribute('aria-current')).toBe('page');

    const generalLink = nav.querySelector('a[href="/dashboard/settings"]');
    expect(generalLink?.getAttribute('aria-current')).toBeNull();
  });

  it('renders child page content in main area', { timeout: 15000 }, async () => {
    const SettingsLayout = (
      await import('./+layout.svelte')
    ).default;

    render(SettingsLayout, {
      props: { data: { projectId: 'proj-1' } }
    });

    const content = screen.getByTestId('settings-content');
    expect(content).toBeInTheDocument();
  });
});
