/**
 * @behavior Content library renders content items with filtering by status,
 * content type, and workflow; each item shows title, status badge, and date
 * @business_rule Users can browse, filter, and manage all content generated
 * by their project's workflows from a central content library
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment variables
vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

const mockContentItems = [
  {
    id: 'content-1',
    project_id: 'proj-1',
    pipeline_run_id: 'run-1',
    title: 'How to Scale SEO in 2025',
    body: null,
    meta_description: 'A guide to scaling SEO',
    tags: ['seo', 'growth'],
    content_type: 'article' as const,
    status: 'published' as const,
    published_at: '2025-01-10T12:00:00Z',
    published_url: 'https://blog.example.com/seo-2025',
    destination_type: 'ghost' as const,
    destination_config: null,
    created_at: '2025-01-09T10:00:00Z',
    updated_at: '2025-01-10T12:00:00Z',
    pipeline_name: 'SEO Writer'
  },
  {
    id: 'content-2',
    project_id: 'proj-1',
    pipeline_run_id: 'run-2',
    title: 'Top 10 AI Tools for Marketers',
    body: null,
    meta_description: 'Best AI tools for marketing',
    tags: ['ai', 'marketing'],
    content_type: 'article' as const,
    status: 'in_review' as const,
    published_at: null,
    published_url: null,
    destination_type: null,
    destination_config: null,
    created_at: '2025-01-09T11:00:00Z',
    updated_at: '2025-01-09T11:00:00Z',
    pipeline_name: 'SEO Writer'
  },
  {
    id: 'content-3',
    project_id: 'proj-1',
    pipeline_run_id: 'run-3',
    title: 'Launch Day Social Post',
    body: null,
    meta_description: null,
    tags: ['launch'],
    content_type: 'social_post' as const,
    status: 'draft' as const,
    published_at: null,
    published_url: null,
    destination_type: null,
    destination_config: null,
    created_at: '2025-01-08T09:00:00Z',
    updated_at: '2025-01-08T09:00:00Z',
    pipeline_name: 'Social Posts'
  },
  {
    id: 'content-4',
    project_id: 'proj-1',
    pipeline_run_id: 'run-4',
    title: 'Product Landing Page Copy',
    body: null,
    meta_description: 'Product launch landing page',
    tags: ['landing', 'product'],
    content_type: 'landing_page' as const,
    status: 'approved' as const,
    published_at: null,
    published_url: null,
    destination_type: null,
    destination_config: null,
    created_at: '2025-01-07T15:00:00Z',
    updated_at: '2025-01-08T10:00:00Z',
    pipeline_name: 'Landing Pages'
  },
  {
    id: 'content-5',
    project_id: 'proj-1',
    pipeline_run_id: 'run-5',
    title: 'Rejected Blog Draft',
    body: null,
    meta_description: 'A rejected article',
    tags: ['rejected'],
    content_type: 'article' as const,
    status: 'rejected' as const,
    published_at: null,
    published_url: null,
    destination_type: null,
    destination_config: null,
    created_at: '2025-01-06T08:00:00Z',
    updated_at: '2025-01-06T12:00:00Z',
    pipeline_name: 'SEO Writer'
  }
];

const mockPipelines = [
  { id: 'pipe-1', name: 'SEO Writer' },
  { id: 'pipe-2', name: 'Social Posts' },
  { id: 'pipe-3', name: 'Landing Pages' }
];

describe('Content Library Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders content items with title, status badge, and date', async () => {
    const ContentPage = (await import('./+page.svelte')).default;

    render(ContentPage, {
      props: {
        data: {
          contentItems: mockContentItems,
          pipelines: mockPipelines
        }
      }
    });

    // All content titles should be visible
    expect(screen.getByText('How to Scale SEO in 2025')).toBeInTheDocument();
    expect(screen.getByText('Top 10 AI Tools for Marketers')).toBeInTheDocument();
    expect(screen.getByText('Launch Day Social Post')).toBeInTheDocument();
    expect(screen.getByText('Product Landing Page Copy')).toBeInTheDocument();
    expect(screen.getByText('Rejected Blog Draft')).toBeInTheDocument();

    // All content items should be rendered
    const contentCards = screen.getAllByTestId('content-item');
    expect(contentCards).toHaveLength(5);

    // Each item should have a status badge
    const statusBadges = screen.getAllByTestId('content-status-badge');
    expect(statusBadges).toHaveLength(5);

    // Each item should have a date
    const dates = screen.getAllByTestId('content-date');
    expect(dates).toHaveLength(5);
  });

  it('status filter narrows results to selected status', async () => {
    const ContentPage = (await import('./+page.svelte')).default;

    render(ContentPage, {
      props: {
        data: {
          contentItems: mockContentItems,
          pipelines: mockPipelines
        }
      }
    });

    // Select "published" status filter
    const statusFilter = screen.getByTestId('status-filter');
    await fireEvent.change(statusFilter, { target: { value: 'published' } });

    // Only "published" items should remain visible
    const contentCards = screen.getAllByTestId('content-item');
    expect(contentCards).toHaveLength(1);
    expect(screen.getByText('How to Scale SEO in 2025')).toBeInTheDocument();
    expect(screen.queryByText('Top 10 AI Tools for Marketers')).not.toBeInTheDocument();
  });

  it('content type filter narrows results to selected type', async () => {
    const ContentPage = (await import('./+page.svelte')).default;

    render(ContentPage, {
      props: {
        data: {
          contentItems: mockContentItems,
          pipelines: mockPipelines
        }
      }
    });

    // Select "social_post" type filter
    const typeFilter = screen.getByTestId('type-filter');
    await fireEvent.change(typeFilter, { target: { value: 'social_post' } });

    // Only social posts should remain visible
    const contentCards = screen.getAllByTestId('content-item');
    expect(contentCards).toHaveLength(1);
    expect(screen.getByText('Launch Day Social Post')).toBeInTheDocument();
    expect(screen.queryByText('How to Scale SEO in 2025')).not.toBeInTheDocument();
  });

  it('workflow filter narrows results to selected workflow content', async () => {
    const ContentPage = (await import('./+page.svelte')).default;

    render(ContentPage, {
      props: {
        data: {
          contentItems: mockContentItems,
          pipelines: mockPipelines
        }
      }
    });

    // Select "Social Posts" pipeline filter
    const pipelineFilter = screen.getByTestId('workflow-filter');
    await fireEvent.change(pipelineFilter, { target: { value: 'Social Posts' } });

    // Only Social Posts pipeline content should remain
    const contentCards = screen.getAllByTestId('content-item');
    expect(contentCards).toHaveLength(1);
    expect(screen.getByText('Launch Day Social Post')).toBeInTheDocument();
    expect(screen.queryByText('How to Scale SEO in 2025')).not.toBeInTheDocument();
    expect(screen.queryByText('Product Landing Page Copy')).not.toBeInTheDocument();
  });
});
