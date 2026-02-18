/**
 * @behavior Login page renders with daisyUI card design: centered card, themed inputs, primary CTA
 * @business_rule Auth pages are the first authenticated touchpoint; professional design builds trust
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));
vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => ({
    auth: { signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }) }
  }))
}));

import LoginPage from './+page.svelte';

describe('Login Page - DaisyUI Styling', () => {
  it('renders centered auth container with card styling', () => {
    render(LoginPage);
    const container = screen.getByTestId('auth-container');
    expect(container.className).toMatch(/flex/);
    expect(container.className).toMatch(/items-center/);
    expect(container.className).toMatch(/justify-center/);
    expect(container.className).toMatch(/min-h-screen/);
  });

  it('renders daisyUI card wrapper with shadow', () => {
    render(LoginPage);
    const card = screen.getByTestId('auth-card');
    expect(card.className).toMatch(/card/);
    expect(card.className).toMatch(/bg-base-200/);
    expect(card.className).toMatch(/shadow-xl/);
    expect(card.className).toMatch(/max-w-md/);
  });

  it('renders inputs with daisyUI input-bordered styling', () => {
    render(LoginPage);
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput.className).toMatch(/input/);
    expect(emailInput.className).toMatch(/input-bordered/);
    expect(emailInput.className).toMatch(/w-full/);
  });

  it('renders primary submit button with daisyUI btn class', () => {
    render(LoginPage);
    const button = screen.getByRole('button', { name: /log in/i });
    expect(button.className).toMatch(/btn/);
    expect(button.className).toMatch(/btn-primary/);
  });

  it('renders signup link', () => {
    render(LoginPage);
    const link = screen.getByText(/sign up/i);
    expect(link.closest('a')).toHaveAttribute('href', '/auth/signup');
  });

  it('renders logo/brand text', () => {
    render(LoginPage);
    expect(screen.getByText(/editengage/i)).toBeInTheDocument();
  });
});
