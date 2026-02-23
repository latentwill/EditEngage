/**
 * @behavior FeedFilterBar provides filter controls for the content review feed
 * @business_rule Reviewers need to filter content by status, pipeline, and content type
 * to efficiently manage their review workflow
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import FeedFilterBar from './FeedFilterBar.svelte';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

const mockPipelines = [
  { id: 'p1', name: 'Blog Pipeline' },
  { id: 'p2', name: 'Social Pipeline' },
  { id: 'p3', name: 'Email Pipeline' }
];

describe('FeedFilterBar', () => {
  it('should render status filter with all options', () => {
    render(FeedFilterBar, {
      props: {
        pipelines: mockPipelines,
        onFilterChange: vi.fn()
      }
    });

    const statusSelect = screen.getByTestId('filter-status') as HTMLSelectElement;
    expect(statusSelect).toBeInTheDocument();

    const options = Array.from(statusSelect.options).map((o) => o.textContent);
    expect(options).toContain('All');
    expect(options).toContain('Pending');
    expect(options).toContain('In Review');
    expect(options).toContain('Approved');
    expect(options).toContain('Published');
    expect(options).toContain('Rejected');
  });

  it('should render pipeline dropdown populated from pipelines prop', () => {
    render(FeedFilterBar, {
      props: {
        pipelines: mockPipelines,
        onFilterChange: vi.fn()
      }
    });

    const pipelineSelect = screen.getByTestId('filter-pipeline') as HTMLSelectElement;
    expect(pipelineSelect).toBeInTheDocument();

    const options = Array.from(pipelineSelect.options).map((o) => o.textContent);
    expect(options).toContain('All');
    expect(options).toContain('Blog Pipeline');
    expect(options).toContain('Social Pipeline');
    expect(options).toContain('Email Pipeline');
  });

  it('should render content type dropdown', () => {
    render(FeedFilterBar, {
      props: {
        pipelines: mockPipelines,
        onFilterChange: vi.fn()
      }
    });

    const contentTypeSelect = screen.getByTestId('filter-content-type') as HTMLSelectElement;
    expect(contentTypeSelect).toBeInTheDocument();

    const options = Array.from(contentTypeSelect.options).map((o) => o.textContent);
    expect(options).toContain('All');
    expect(options).toContain('Article');
    expect(options).toContain('Social Post');
    expect(options).toContain('Landing Page');
    expect(options).toContain('Email');
  });

  it('should emit filter change on selection', async () => {
    const onFilterChange = vi.fn();
    render(FeedFilterBar, {
      props: {
        pipelines: mockPipelines,
        onFilterChange
      }
    });

    const statusSelect = screen.getByTestId('filter-status') as HTMLSelectElement;
    await fireEvent.change(statusSelect, { target: { value: 'pending' } });

    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' })
    );
  });

  it('should have sticky positioning', () => {
    render(FeedFilterBar, {
      props: {
        pipelines: mockPipelines,
        onFilterChange: vi.fn()
      }
    });

    const filterBar = screen.getByTestId('feed-filter-bar');
    expect(filterBar.className).toContain('sticky');
    expect(filterBar.className).toContain('top-0');
  });

  it('should combine multiple filters', async () => {
    const onFilterChange = vi.fn();
    render(FeedFilterBar, {
      props: {
        pipelines: mockPipelines,
        onFilterChange
      }
    });

    const statusSelect = screen.getByTestId('filter-status') as HTMLSelectElement;
    const pipelineSelect = screen.getByTestId('filter-pipeline') as HTMLSelectElement;

    await fireEvent.change(statusSelect, { target: { value: 'pending' } });
    await fireEvent.change(pipelineSelect, { target: { value: 'p1' } });

    // The last call should contain both filters combined
    const lastCall = onFilterChange.mock.calls[onFilterChange.mock.calls.length - 1][0];
    expect(lastCall).toEqual(
      expect.objectContaining({ status: 'pending', pipeline_id: 'p1' })
    );
  });
});
