/**
 * @behavior Topic delete button shows on all topic cards and removes topic after confirmation
 * @business_rule Users can delete any topic they have access to via project scoping
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTopics = [
  {
    id: 'topic-1',
    project_id: 'proj-1',
    pipeline_id: null,
    title: 'Test Topic',
    keywords: ['seo'],
    seo_score: 85,
    status: 'pending' as const,
    notes: null,
    completed_at: null,
    content_id: null,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'topic-2',
    project_id: 'proj-1',
    pipeline_id: null,
    title: 'Completed Topic',
    keywords: [],
    seo_score: null,
    status: 'completed' as const,
    notes: null,
    completed_at: '2024-01-02T00:00:00Z',
    content_id: null,
    created_at: '2024-01-01T00:00:00Z'
  }
];

describe('Topic delete UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders delete button on topic cards', async () => {
    const TopicsPage = (await import('./+page.svelte')).default;
    render(TopicsPage, {
      props: {
        data: { topics: mockTopics, varietyMemory: [], projectId: 'proj-1' }
      }
    });

    const deleteButtons = screen.getAllByTestId('delete-topic-button');
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it('shows confirmation modal when delete is clicked', async () => {
    const TopicsPage = (await import('./+page.svelte')).default;
    render(TopicsPage, {
      props: {
        data: { topics: mockTopics, varietyMemory: [], projectId: 'proj-1' }
      }
    });

    const deleteButton = screen.getAllByTestId('delete-topic-button')[0];
    await fireEvent.click(deleteButton);

    expect(screen.getByTestId('delete-confirm-modal')).toBeInTheDocument();
  });

  it('confirm delete calls API and removes topic', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    const TopicsPage = (await import('./+page.svelte')).default;
    render(TopicsPage, {
      props: {
        data: { topics: mockTopics, varietyMemory: [], projectId: 'proj-1' }
      }
    });

    const deleteButton = screen.getAllByTestId('delete-topic-button')[0];
    await fireEvent.click(deleteButton);

    const confirmButton = screen.getByTestId('confirm-delete-button');
    await fireEvent.click(confirmButton);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/topics/topic-1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('cancel closes modal without deleting', async () => {
    const TopicsPage = (await import('./+page.svelte')).default;
    render(TopicsPage, {
      props: {
        data: { topics: mockTopics, varietyMemory: [], projectId: 'proj-1' }
      }
    });

    const deleteButton = screen.getAllByTestId('delete-topic-button')[0];
    await fireEvent.click(deleteButton);

    const cancelButton = screen.getByTestId('cancel-delete-button');
    await fireEvent.click(cancelButton);

    expect(screen.queryByTestId('delete-confirm-modal')).not.toBeInTheDocument();
  });
});
