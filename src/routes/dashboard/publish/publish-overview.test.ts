/**
 * @behavior Publish overview page shows publication stats, recent publications, and destination status.
 * Replaces the "Coming Soon" placeholder with real data.
 * @business_rule Users see an overview of their publishing activity including totals,
 * recent publications, and destination health at a glance.
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => ({}))
}));

const mockLoaderFrom = vi.fn();

const mockLoaderSupabase = {
  from: mockLoaderFrom
};

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockLoaderSupabase),
  createServiceRoleClient: vi.fn()
}));

function createChain(resolvedValue: { data: unknown; error: unknown; count?: number | null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(resolvedValue));
  // Make it thenable
  return new Proxy(chain, {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void, reject: (v: unknown) => void) =>
          Promise.resolve(resolvedValue).then(resolve, reject);
      }
      return target[prop as string];
    }
  });
}

const mockPublishedContent = [
  {
    id: 'c1',
    title: 'First Article',
    status: 'published' as const,
    published_at: '2024-06-01T00:00:00Z',
    destination_type: 'ghost' as const,
    content_type: 'article' as const,
    project_id: 'proj-1',
    body: null,
    destination_config: null,
    meta_description: null,
    pipeline_run_id: null,
    published_url: 'https://blog.com/first',
    tags: [],
    created_at: '2024-05-01T00:00:00Z',
    updated_at: '2024-06-01T00:00:00Z'
  },
  {
    id: 'c2',
    title: 'Second Article',
    status: 'published' as const,
    published_at: '2024-06-02T00:00:00Z',
    destination_type: 'ghost' as const,
    content_type: 'article' as const,
    project_id: 'proj-1',
    body: null,
    destination_config: null,
    meta_description: null,
    pipeline_run_id: null,
    published_url: null,
    tags: [],
    created_at: '2024-05-02T00:00:00Z',
    updated_at: '2024-06-02T00:00:00Z'
  }
];

const mockDestinations = [
  { id: 'd1', name: 'My Ghost', type: 'ghost' as const, is_active: true, project_id: 'proj-1', config: {}, created_at: '', updated_at: '' },
  { id: 'd2', name: 'Webhook', type: 'webhook' as const, is_active: false, project_id: 'proj-1', config: {}, created_at: '', updated_at: '' }
];

describe('Publish Overview Page Loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches published content count, recent publications, and destinations', async () => {
    const contentChain = createChain({ data: mockPublishedContent, error: null, count: 5 });
    const destChain = createChain({ data: mockDestinations, error: null });

    mockLoaderFrom.mockImplementation((table: string) => {
      if (table === 'content') return contentChain;
      if (table === 'destinations') return destChain;
      return createChain({ data: null, error: null });
    });

    const { load } = await import('./+page.server');

    const result = await load({
      parent: vi.fn().mockResolvedValue({ projects: [{ id: 'proj-1' }] }),
      cookies: {} as never
    } as never);

    expect(mockLoaderFrom).toHaveBeenCalledWith('content');
    expect(mockLoaderFrom).toHaveBeenCalledWith('destinations');
    expect(result).toHaveProperty('recentPublications');
    expect(result).toHaveProperty('destinations');
    expect(result).toHaveProperty('projectId');
  });

  it('returns empty arrays when no active project', async () => {
    const { load } = await import('./+page.server');

    const result = await load({
      parent: vi.fn().mockResolvedValue({ projects: [] }),
      cookies: {} as never
    } as never);

    expect(result).toEqual({
      recentPublications: [],
      destinations: [],
      projectId: ''
    });
  });
});

describe('Publish Overview Page', () => {
  it('renders publish overview with data-testid', async () => {
    const PublishPage = (await import('./+page.svelte')).default;
    render(PublishPage, {
      props: {
        data: {
          recentPublications: mockPublishedContent,
          destinations: mockDestinations,
          projectId: 'proj-1'
        }
      }
    });

    expect(screen.getByTestId('publish-page')).toBeInTheDocument();
  });

  it('renders stats cards showing published count', async () => {
    const PublishPage = (await import('./+page.svelte')).default;
    render(PublishPage, {
      props: {
        data: {
          recentPublications: mockPublishedContent,
          destinations: mockDestinations,
          projectId: 'proj-1'
        }
      }
    });

    expect(screen.getByTestId('stat-published')).toBeInTheDocument();
    expect(screen.getByTestId('stat-published')).toHaveTextContent('2');
  });

  it('renders recent publications list with titles', async () => {
    const PublishPage = (await import('./+page.svelte')).default;
    render(PublishPage, {
      props: {
        data: {
          recentPublications: mockPublishedContent,
          destinations: mockDestinations,
          projectId: 'proj-1'
        }
      }
    });

    expect(screen.getByText('First Article')).toBeInTheDocument();
    expect(screen.getByText('Second Article')).toBeInTheDocument();
  });

  it('renders destination quick-status with names', async () => {
    const PublishPage = (await import('./+page.svelte')).default;
    render(PublishPage, {
      props: {
        data: {
          recentPublications: [],
          destinations: mockDestinations,
          projectId: 'proj-1'
        }
      }
    });

    expect(screen.getByText('My Ghost')).toBeInTheDocument();
    expect(screen.getByText('Webhook')).toBeInTheDocument();
  });

  it('renders active/inactive badge for each destination', async () => {
    const PublishPage = (await import('./+page.svelte')).default;
    render(PublishPage, {
      props: {
        data: {
          recentPublications: [],
          destinations: mockDestinations,
          projectId: 'proj-1'
        }
      }
    });

    const activeBadges = screen.getAllByText('active');
    const inactiveBadges = screen.getAllByText('inactive');
    expect(activeBadges.length).toBeGreaterThanOrEqual(1);
    expect(inactiveBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('has a link to /dashboard/publish/destinations', async () => {
    const PublishPage = (await import('./+page.svelte')).default;
    render(PublishPage, {
      props: {
        data: {
          recentPublications: [],
          destinations: mockDestinations,
          projectId: 'proj-1'
        }
      }
    });

    const link = screen.getByRole('link', { name: /destinations/i });
    expect(link).toHaveAttribute('href', '/dashboard/publish/destinations');
  });

  it('does not show Coming Soon text', async () => {
    const PublishPage = (await import('./+page.svelte')).default;
    render(PublishPage, {
      props: {
        data: {
          recentPublications: [],
          destinations: [],
          projectId: 'proj-1'
        }
      }
    });

    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });
});
