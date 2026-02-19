/**
 * @behavior Publish page displays a coming-soon placeholder at /dashboard/publish
 * @business_rule Publish features are planned but not yet implemented; users see a clear placeholder
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

describe('Publish Placeholder Page', () => {
  it('renders with "Publish" heading', async () => {
    const PublishPage = (await import('./+page.svelte')).default;
    render(PublishPage);

    expect(screen.getByRole('heading', { name: /publish/i })).toBeInTheDocument();
  });

  it('shows coming soon indicator', async () => {
    const PublishPage = (await import('./+page.svelte')).default;
    render(PublishPage);

    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });
});
