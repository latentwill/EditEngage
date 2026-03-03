/**
 * @behavior Content library allows bulk selection and bulk approve/reject actions
 * @business_rule Users can select multiple content items and perform bulk approve
 * or reject actions via a floating action bar, streamlining review workflows
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
    title: 'Article Alpha',
    body: null,
    meta_description: null,
    tags: ['seo'],
    content_type: 'article' as const,
    status: 'in_review' as const,
    published_at: null,
    published_url: null,
    destination_type: null,
    destination_config: null,
    created_at: '2025-01-09T10:00:00Z',
    updated_at: '2025-01-09T10:00:00Z',
    pipeline_name: 'SEO Writer'
  },
  {
    id: 'content-2',
    project_id: 'proj-1',
    pipeline_run_id: 'run-2',
    title: 'Article Beta',
    body: null,
    meta_description: null,
    tags: ['ai'],
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
    title: 'Article Gamma',
    body: null,
    meta_description: null,
    tags: ['tech'],
    content_type: 'social_post' as const,
    status: 'draft' as const,
    published_at: null,
    published_url: null,
    destination_type: null,
    destination_config: null,
    created_at: '2025-01-08T09:00:00Z',
    updated_at: '2025-01-08T09:00:00Z',
    pipeline_name: 'Social Posts'
  }
];

const mockPipelines = [
  { id: 'pipe-1', name: 'SEO Writer' },
  { id: 'pipe-2', name: 'Social Posts' }
];

const defaultData = { contentItems: mockContentItems, pipelines: mockPipelines };

describe('Content Library Bulk Actions', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
  });

  it('renders a checkbox for each content item', async () => {
    const ContentPage = (await import('./+page.svelte')).default;
    render(ContentPage, { props: { data: defaultData } });

    const checkboxes = screen.getAllByTestId('content-checkbox');
    expect(checkboxes).toHaveLength(3);
  });

  it('renders a select-all checkbox', async () => {
    const ContentPage = (await import('./+page.svelte')).default;
    render(ContentPage, { props: { data: defaultData } });

    expect(screen.getByTestId('select-all-checkbox')).toBeInTheDocument();
  });

  it('does not show BulkActionBar when nothing is selected', async () => {
    const ContentPage = (await import('./+page.svelte')).default;
    render(ContentPage, { props: { data: defaultData } });

    expect(screen.queryByTestId('bulk-action-bar')).not.toBeInTheDocument();
  });

  it('shows BulkActionBar when a checkbox is clicked', async () => {
    const ContentPage = (await import('./+page.svelte')).default;
    render(ContentPage, { props: { data: defaultData } });

    const checkboxes = screen.getAllByTestId('content-checkbox');
    await fireEvent.click(checkboxes[0]);

    expect(screen.getByTestId('bulk-action-bar')).toBeInTheDocument();
    expect(screen.getByTestId('selected-count').textContent).toBe('1');
  });

  it('toggles individual selection on and off', async () => {
    const ContentPage = (await import('./+page.svelte')).default;
    render(ContentPage, { props: { data: defaultData } });

    const checkboxes = screen.getAllByTestId('content-checkbox');
    await fireEvent.click(checkboxes[0]);
    expect(screen.getByTestId('selected-count').textContent).toBe('1');

    await fireEvent.click(checkboxes[0]);
    expect(screen.queryByTestId('bulk-action-bar')).not.toBeInTheDocument();
  });

  it('select-all selects all visible items', async () => {
    const ContentPage = (await import('./+page.svelte')).default;
    render(ContentPage, { props: { data: defaultData } });

    await fireEvent.click(screen.getByTestId('select-all-checkbox'));

    expect(screen.getByTestId('selected-count').textContent).toBe('3');
  });

  it('select-all deselects all when all are already selected', async () => {
    const ContentPage = (await import('./+page.svelte')).default;
    render(ContentPage, { props: { data: defaultData } });

    await fireEvent.click(screen.getByTestId('select-all-checkbox'));
    expect(screen.getByTestId('selected-count').textContent).toBe('3');

    await fireEvent.click(screen.getByTestId('select-all-checkbox'));
    expect(screen.queryByTestId('bulk-action-bar')).not.toBeInTheDocument();
  });

  it('approve handler POSTs bulk approve with selected ids', async () => {
    const ContentPage = (await import('./+page.svelte')).default;
    render(ContentPage, { props: { data: defaultData } });

    const checkboxes = screen.getAllByTestId('content-checkbox');
    await fireEvent.click(checkboxes[0]);
    await fireEvent.click(checkboxes[1]);

    await fireEvent.click(screen.getByTestId('bulk-approve-btn'));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/v1/content/bulk', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ action: 'approve', ids: ['content-1', 'content-2'] })
      }));
    });
  });

  it('reject handler POSTs bulk reject with selected ids', async () => {
    const ContentPage = (await import('./+page.svelte')).default;
    render(ContentPage, { props: { data: defaultData } });

    const checkboxes = screen.getAllByTestId('content-checkbox');
    await fireEvent.click(checkboxes[0]);

    await fireEvent.click(screen.getByTestId('bulk-reject-btn'));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/v1/content/bulk', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ action: 'reject', ids: ['content-1'] })
      }));
    });
  });

  it('clears selection after successful bulk action', async () => {
    const ContentPage = (await import('./+page.svelte')).default;
    render(ContentPage, { props: { data: defaultData } });

    const checkboxes = screen.getAllByTestId('content-checkbox');
    await fireEvent.click(checkboxes[0]);
    expect(screen.getByTestId('bulk-action-bar')).toBeInTheDocument();

    await fireEvent.click(screen.getByTestId('bulk-approve-btn'));

    await waitFor(() => {
      expect(screen.queryByTestId('bulk-action-bar')).not.toBeInTheDocument();
    });
  });
});
