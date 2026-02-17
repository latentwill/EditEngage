/**
 * @behavior Signup page renders with glassmorphism: centered card, glass inputs, emerald CTA, login link
 * @business_rule Professional signup page builds trust and increases conversion
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));
vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => ({
    auth: { signUp: vi.fn().mockResolvedValue({ data: {}, error: null }) }
  }))
}));

import SignupPage from './+page.svelte';

describe('Signup Page - Glassmorphism Styling', () => {
  it('renders centered auth container', () => {
    render(SignupPage);
    const container = screen.getByTestId('auth-container');
    expect(container.className).toMatch(/flex/);
    expect(container.className).toMatch(/items-center/);
    expect(container.className).toMatch(/justify-center/);
    expect(container.className).toMatch(/min-h-screen/);
  });

  it('renders glass card wrapper', () => {
    render(SignupPage);
    const card = screen.getByTestId('auth-card');
    expect(card.className).toMatch(/backdrop-blur/);
    expect(card.className).toMatch(/border/);
    expect(card.className).toMatch(/rounded-xl/);
    expect(card.className).toMatch(/max-w-md/);
  });

  it('renders inputs with glass styling', () => {
    render(SignupPage);
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput.className).toMatch(/bg-white/);
    expect(emailInput.className).toMatch(/rounded-lg/);
    expect(emailInput.className).toMatch(/text-white/);
  });

  it('renders primary emerald submit button', () => {
    render(SignupPage);
    const button = screen.getByRole('button', { name: /sign up/i });
    expect(button.className).toMatch(/bg-emerald/);
    expect(button.className).toMatch(/rounded-lg/);
  });

  it('renders login link', () => {
    render(SignupPage);
    const link = screen.getByText(/sign in/i);
    expect(link.closest('a')).toHaveAttribute('href', '/auth/login');
  });

  it('renders logo/brand text', () => {
    render(SignupPage);
    expect(screen.getByText(/editengage/i)).toBeInTheDocument();
  });
});
