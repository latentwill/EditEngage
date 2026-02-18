/**
 * @behavior Destinations page renders styled cards and forms with daisyUI design
 * @business_rule Destination management needs clear visual hierarchy for configuration
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

import DestinationsPage from './+page.svelte';

const mockDestinations = [
  { id: '1', project_id: 'p1', type: 'ghost' as const, name: 'My Ghost', config: {}, is_active: true, created_at: '', updated_at: '' },
  { id: '2', project_id: 'p1', type: 'postbridge' as const, name: 'My PB', config: {}, is_active: false, created_at: '', updated_at: '' }
];

describe('Destinations Page - Styling', () => {
  it('renders page with styled heading', () => {
    render(DestinationsPage, { props: { data: { destinations: mockDestinations } } });
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.className).toMatch(/text-2xl|text-xl/);
    expect(heading.className).toMatch(/font-bold|font-semibold/);
    expect(heading.className).toMatch(/text-base-content/);
  });

  it('renders destination cards with daisyUI styling', () => {
    render(DestinationsPage, { props: { data: { destinations: mockDestinations } } });
    const cards = screen.getAllByTestId('destination-card');
    cards.forEach(card => {
      expect(card.className).toMatch(/card/);
      expect(card.className).toMatch(/bg-base-200/);
    });
  });

  it('renders add button with daisyUI styling', () => {
    render(DestinationsPage, { props: { data: { destinations: mockDestinations } } });
    const addButton = screen.getByText(/add destination/i);
    expect(addButton.className).toMatch(/btn/);
  });
});
