/**
 * @behavior Settings general page renders with proper styling
 * @business_rule Settings page provides a clean layout for project configuration
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

describe('Settings General Page - Styling', () => {
  it('renders settings page with proper testid', () => {
    render(SettingsPage);
    const page = screen.getByTestId('settings-page');
    expect(page).toBeInTheDocument();
  });

  it('has styled heading', () => {
    render(SettingsPage);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.className).toMatch(/text-2xl|text-xl/);
    expect(heading.className).toMatch(/font-bold|font-semibold/);
  });

  it('displays General Settings title', () => {
    render(SettingsPage);
    expect(screen.getByText('General Settings')).toBeInTheDocument();
  });
});
