/**
 * @behavior Writing styles page renders styled cards and form with glassmorphism
 * @business_rule Writing style management needs clear presentation for content brand consistency
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

describe('Writing Styles Page - Styling', () => {
  it('renders page with styled heading', () => {
    render(WritingStylesPage, { props: { data: { writingStyles: mockStyles } } });
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.className).toMatch(/text-2xl|text-xl/);
    expect(heading.className).toMatch(/font-bold|font-semibold/);
    expect(heading.className).toMatch(/text-white/);
  });

  it('renders style cards with glass styling', () => {
    render(WritingStylesPage, { props: { data: { writingStyles: mockStyles } } });
    const cards = screen.getAllByTestId('writing-style-card');
    cards.forEach(card => {
      expect(card.className).toMatch(/backdrop-blur|bg-white|bg-\[var/);
      expect(card.className).toMatch(/border/);
      expect(card.className).toMatch(/rounded/);
    });
  });

  it('renders create button with styling', () => {
    render(WritingStylesPage, { props: { data: { writingStyles: mockStyles } } });
    const button = screen.getByText(/create style/i);
    expect(button.className).toMatch(/bg-/);
    expect(button.className).toMatch(/rounded/);
    expect(button.className).toMatch(/px-/);
  });
});
