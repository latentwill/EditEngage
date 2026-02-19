/**
 * @behavior Destinations page renders at /dashboard/publish/destinations with destination cards
 * @business_rule Destination management is part of the Publish workflow, not Settings
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

describe('Destinations Page at /dashboard/publish/destinations', () => {
  it('renders destinations page with data-testid', () => {
    render(DestinationsPage, { props: { data: { destinations: mockDestinations } } });
    expect(screen.getByTestId('destinations-page')).toBeInTheDocument();
  });

  it('renders destination cards with data', () => {
    render(DestinationsPage, { props: { data: { destinations: mockDestinations } } });
    const cards = screen.getAllByTestId('destination-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('My Ghost')).toBeInTheDocument();
    expect(screen.getByText('My PB')).toBeInTheDocument();
  });

  it('renders with empty destinations array', () => {
    render(DestinationsPage, { props: { data: { destinations: [] } } });
    expect(screen.getByTestId('destinations-page')).toBeInTheDocument();
    expect(screen.queryAllByTestId('destination-card')).toHaveLength(0);
  });
});
