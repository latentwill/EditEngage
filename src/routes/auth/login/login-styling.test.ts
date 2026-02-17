/**
 * @behavior Login page renders with glassmorphism design: centered card, gradient bg, glass inputs, emerald CTA
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

describe('Login Page - Glassmorphism Styling', () => {
  it('renders centered auth container with glass card styling', () => {
    render(LoginPage);
    const container = screen.getByTestId('auth-container');
    expect(container.className).toMatch(/flex/);
    expect(container.className).toMatch(/items-center/);
    expect(container.className).toMatch(/justify-center/);
    expect(container.className).toMatch(/min-h-screen/);
  });

  it('renders glass card wrapper with backdrop-blur and border', () => {
    render(LoginPage);
    const card = screen.getByTestId('auth-card');
    expect(card.className).toMatch(/backdrop-blur/);
    expect(card.className).toMatch(/border/);
    expect(card.className).toMatch(/rounded-xl/);
    expect(card.className).toMatch(/max-w-md/);
  });

  it('renders inputs with glass styling', () => {
    render(LoginPage);
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput.className).toMatch(/bg-white/);
    expect(emailInput.className).toMatch(/border/);
    expect(emailInput.className).toMatch(/rounded-lg/);
    expect(emailInput.className).toMatch(/text-white/);
  });

  it('renders primary emerald submit button', () => {
    render(LoginPage);
    const button = screen.getByRole('button', { name: /log in/i });
    expect(button.className).toMatch(/bg-emerald/);
    expect(button.className).toMatch(/rounded-lg/);
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
