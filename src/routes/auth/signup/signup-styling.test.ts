/**
 * @behavior Signup page renders with daisyUI card: centered card, themed inputs, primary CTA, login link
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

describe('Signup Page - DaisyUI Styling', () => {
  it('renders centered auth container', () => {
    render(SignupPage);
    const container = screen.getByTestId('auth-container');
    expect(container.className).toMatch(/flex/);
    expect(container.className).toMatch(/items-center/);
    expect(container.className).toMatch(/justify-center/);
    expect(container.className).toMatch(/min-h-screen/);
  });

  it('renders daisyUI card wrapper with shadow', () => {
    render(SignupPage);
    const card = screen.getByTestId('auth-card');
    expect(card.className).toMatch(/card/);
    expect(card.className).toMatch(/bg-base-200/);
    expect(card.className).toMatch(/shadow-xl/);
    expect(card.className).toMatch(/max-w-md/);
  });

  it('renders inputs with daisyUI input-bordered styling', () => {
    render(SignupPage);
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput.className).toMatch(/input/);
    expect(emailInput.className).toMatch(/input-bordered/);
    expect(emailInput.className).toMatch(/w-full/);
  });

  it('renders primary submit button with daisyUI btn class', () => {
    render(SignupPage);
    const button = screen.getByRole('button', { name: /sign up/i });
    expect(button.className).toMatch(/btn/);
    expect(button.className).toMatch(/btn-primary/);
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
