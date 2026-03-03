/**
 * @behavior Publish page displays an overview of publishing activity
 * @business_rule Users see their publishing stats, recent publications, and destination status
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

const defaultData = {
  recentPublications: [],
  destinations: [],
  projectId: 'proj-1'
};

describe('Publish Overview Page', () => {
  it('renders with "Publish" heading', async () => {
    const PublishPage = (await import('./+page.svelte')).default;
    render(PublishPage, { props: { data: defaultData } });

    expect(screen.getByRole('heading', { name: /publish/i })).toBeInTheDocument();
  });

  it('renders publish page testid', async () => {
    const PublishPage = (await import('./+page.svelte')).default;
    render(PublishPage, { props: { data: defaultData } });

    expect(screen.getByTestId('publish-page')).toBeInTheDocument();
  });
});
