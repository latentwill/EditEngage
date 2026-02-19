/**
 * @behavior Writing styles page renders at /dashboard/write/styles with styled cards and form
 * @business_rule Writing style management is part of the Write workflow, not Settings
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

import WritingStylesPage from './+page.svelte';

const mockStyles = [
  { id: '1', project_id: 'p1', name: 'Conversational', tone: 'conversational', voice_guidelines: 'Be friendly', avoid_phrases: ['synergy'], example_content: 'Hey there!', created_at: '', updated_at: '' }
];

describe('Writing Styles Page at /dashboard/write/styles', () => {
  it('renders writing styles page with data-testid', () => {
    render(WritingStylesPage, { props: { data: { writingStyles: mockStyles } } });
    expect(screen.getByTestId('writing-styles-page')).toBeInTheDocument();
  });

  it('renders style cards with writing style data', () => {
    render(WritingStylesPage, { props: { data: { writingStyles: mockStyles } } });
    const cards = screen.getAllByTestId('writing-style-card');
    expect(cards).toHaveLength(1);
    expect(screen.getByText('Conversational')).toBeInTheDocument();
  });

  it('renders with empty styles array', () => {
    render(WritingStylesPage, { props: { data: { writingStyles: [] } } });
    expect(screen.getByTestId('writing-styles-page')).toBeInTheDocument();
    expect(screen.queryAllByTestId('writing-style-card')).toHaveLength(0);
  });
});
