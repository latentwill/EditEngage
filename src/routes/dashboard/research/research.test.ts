/**
 * @behavior Research page displays a coming-soon placeholder at /dashboard/research
 * @business_rule Research features are planned but not yet implemented; users see a clear placeholder
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

describe('Research Placeholder Page', () => {
  it('renders with "Research" heading', async () => {
    const ResearchPage = (await import('./+page.svelte')).default;
    render(ResearchPage);

    expect(screen.getByRole('heading', { name: /research/i })).toBeInTheDocument();
  });

  it('shows coming soon indicator', async () => {
    const ResearchPage = (await import('./+page.svelte')).default;
    render(ResearchPage);

    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });
});
