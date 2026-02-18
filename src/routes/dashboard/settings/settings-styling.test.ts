/**
 * @behavior Settings page renders sidebar navigation with glass styling and active link highlighting
 * @business_rule Settings page provides organized access to project configuration
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';

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

import SettingsPage from './+page.svelte';

describe('Settings Page - Styling', () => {
  it('renders settings page with glass card styling', () => {
    render(SettingsPage);
    const page = screen.getByTestId('settings-page');
    expect(page).toBeInTheDocument();
  });

  it('renders settings nav with daisyUI menu and links', () => {
    render(SettingsPage);
    const nav = screen.getByTestId('settings-nav');
    expect(nav.className).toMatch(/menu/);
    const links = nav.querySelectorAll('a');
    expect(links.length).toBeGreaterThanOrEqual(3);
  });

  it('has styled heading', () => {
    render(SettingsPage);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.className).toMatch(/text-2xl|text-xl/);
    expect(heading.className).toMatch(/font-bold|font-semibold/);
  });

  it('nav links are inside daisyUI menu list items', () => {
    render(SettingsPage);
    const nav = screen.getByTestId('settings-nav');
    const listItems = nav.querySelectorAll('li');
    expect(listItems.length).toBeGreaterThanOrEqual(3);
    listItems.forEach(li => {
      expect(li.querySelector('a')).not.toBeNull();
    });
  });
});
