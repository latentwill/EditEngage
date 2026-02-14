/**
 * @behavior Topics page displays queue management UI with tabs for
 * Pending, Completed, and Skipped topics; supports adding, importing,
 * skipping topics; and viewing variety memory
 * @business_rule Users manage their topic queue to control which content
 * gets produced — topics can be added manually or via CSV import,
 * skipped to remove from active queue, and variety memory prevents
 * duplicate content lines
 */
import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

const mockTopics = [
  {
    id: 'topic-1',
    project_id: 'proj-1',
    pipeline_id: null,
    title: 'How to Build a SaaS MVP',
    keywords: ['saas', 'mvp', 'startup'],
    seo_score: 85,
    status: 'pending' as const,
    notes: 'High priority topic',
    completed_at: null,
    content_id: null,
    created_at: '2025-01-15T10:00:00Z'
  },
  {
    id: 'topic-2',
    project_id: 'proj-1',
    pipeline_id: 'pipe-1',
    title: 'Best SEO Practices 2025',
    keywords: ['seo', 'practices'],
    seo_score: 92,
    status: 'pending' as const,
    notes: null,
    completed_at: null,
    content_id: null,
    created_at: '2025-01-14T10:00:00Z'
  },
  {
    id: 'topic-3',
    project_id: 'proj-1',
    pipeline_id: null,
    title: 'Content Marketing Guide',
    keywords: ['content', 'marketing'],
    seo_score: 78,
    status: 'completed' as const,
    notes: 'Published successfully',
    completed_at: '2025-01-13T15:00:00Z',
    content_id: 'content-1',
    created_at: '2025-01-10T10:00:00Z'
  },
  {
    id: 'topic-4',
    project_id: 'proj-1',
    pipeline_id: null,
    title: 'Outdated SEO Tricks',
    keywords: ['seo', 'outdated'],
    seo_score: 30,
    status: 'skipped' as const,
    notes: 'No longer relevant',
    completed_at: null,
    content_id: null,
    created_at: '2025-01-09T10:00:00Z'
  }
];

const mockVarietyMemory = [
  {
    id: 'vm-1',
    project_id: 'proj-1',
    canonical_line: 'In the ever-evolving landscape of digital marketing',
    content_id: 'content-1',
    created_at: '2025-01-12T10:00:00Z'
  },
  {
    id: 'vm-2',
    project_id: 'proj-1',
    canonical_line: 'As businesses continue to embrace AI-powered solutions',
    content_id: null,
    created_at: '2025-01-11T10:00:00Z'
  }
];

describe('Topics Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tabs: Pending, Completed, Skipped', async () => {
    const TopicsPage = (await import('./+page.svelte')).default;

    render(TopicsPage, {
      props: {
        data: {
          topics: mockTopics,
          varietyMemory: mockVarietyMemory
        }
      }
    });

    expect(screen.getByTestId('tab-pending')).toBeInTheDocument();
    expect(screen.getByTestId('tab-completed')).toBeInTheDocument();
    expect(screen.getByTestId('tab-skipped')).toBeInTheDocument();

    expect(screen.getByTestId('tab-pending')).toHaveTextContent('Pending');
    expect(screen.getByTestId('tab-completed')).toHaveTextContent('Completed');
    expect(screen.getByTestId('tab-skipped')).toHaveTextContent('Skipped');
  });

  it('pending tab shows topics sorted by SEO score with status badges', async () => {
    const TopicsPage = (await import('./+page.svelte')).default;

    render(TopicsPage, {
      props: {
        data: {
          topics: mockTopics,
          varietyMemory: mockVarietyMemory
        }
      }
    });

    // Pending tab should be active by default
    const topicItems = screen.getAllByTestId('topic-item');

    // Only pending topics should be visible (topic-1 and topic-2)
    expect(topicItems).toHaveLength(2);

    // Sorted by SEO score descending: topic-2 (92) should come before topic-1 (85)
    const firstItem = topicItems[0];
    const secondItem = topicItems[1];
    expect(within(firstItem).getByTestId('topic-title')).toHaveTextContent('Best SEO Practices 2025');
    expect(within(secondItem).getByTestId('topic-title')).toHaveTextContent('How to Build a SaaS MVP');

    // Each topic should have a status badge
    const badges = screen.getAllByTestId('topic-status-badge');
    expect(badges).toHaveLength(2);
    expect(badges[0]).toHaveTextContent('pending');
  });

  it('"Add Topic" form creates topic with title, keywords, and notes', async () => {
    const TopicsPage = (await import('./+page.svelte')).default;

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          id: 'topic-new',
          project_id: 'proj-1',
          pipeline_id: null,
          title: 'New Topic Title',
          keywords: ['keyword1', 'keyword2'],
          seo_score: null,
          status: 'pending',
          notes: 'Some notes',
          completed_at: null,
          content_id: null,
          created_at: '2025-01-16T10:00:00Z'
        }
      })
    });
    vi.stubGlobal('fetch', fetchSpy);

    render(TopicsPage, {
      props: {
        data: {
          topics: mockTopics,
          varietyMemory: mockVarietyMemory
        }
      }
    });

    // Open the add topic form
    const addButton = screen.getByTestId('add-topic-button');
    await fireEvent.click(addButton);

    // Fill in the form
    const titleInput = screen.getByTestId('topic-title-input');
    const keywordsInput = screen.getByTestId('topic-keywords-input');
    const notesInput = screen.getByTestId('topic-notes-input');

    await fireEvent.input(titleInput, { target: { value: 'New Topic Title' } });
    await fireEvent.input(keywordsInput, { target: { value: 'keyword1, keyword2' } });
    await fireEvent.input(notesInput, { target: { value: 'Some notes' } });

    // Submit the form
    const submitButton = screen.getByTestId('topic-submit-button');
    await fireEvent.click(submitButton);

    // Verify fetch was called with correct data
    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Topic Title',
        keywords: ['keyword1', 'keyword2'],
        notes: 'Some notes'
      })
    });
  });

  it('CSV import uploads file and adds valid topics with import summary', async () => {
    const TopicsPage = (await import('./+page.svelte')).default;

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          imported: 3,
          skipped: 1,
          errors: ['Row 4: missing title']
        }
      })
    });
    vi.stubGlobal('fetch', fetchSpy);

    render(TopicsPage, {
      props: {
        data: {
          topics: mockTopics,
          varietyMemory: mockVarietyMemory
        }
      }
    });

    // Click the import button
    const importButton = screen.getByTestId('import-topics-button');
    await fireEvent.click(importButton);

    // Simulate file selection
    const fileInput = screen.getByTestId('csv-file-input');
    const csvFile = new File(
      ['title,keywords,notes\nTopic A,"kw1,kw2",note\nTopic B,kw3,\nTopic C,"kw4,kw5",note2\n,kw6,missing title'],
      'topics.csv',
      { type: 'text/csv' }
    );
    await fireEvent.change(fileInput, { target: { files: [csvFile] } });

    // Upload button should trigger the import
    const uploadButton = screen.getByTestId('csv-upload-button');
    await fireEvent.click(uploadButton);

    // Verify fetch was called to the import endpoint
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/v1/topics/import',
      expect.objectContaining({
        method: 'POST'
      })
    );

    // Import summary should be displayed
    expect(screen.getByTestId('import-summary')).toBeInTheDocument();
    expect(screen.getByTestId('import-count')).toHaveTextContent('3');
    expect(screen.getByTestId('import-skipped')).toHaveTextContent('1');
  });

  it('skip button marks topic as "skipped" (removed from active queue)', async () => {
    const TopicsPage = (await import('./+page.svelte')).default;

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: { ...mockTopics[0], status: 'skipped' }
      })
    });
    vi.stubGlobal('fetch', fetchSpy);

    render(TopicsPage, {
      props: {
        data: {
          topics: mockTopics,
          varietyMemory: mockVarietyMemory
        }
      }
    });

    // Pending tab is active by default, find skip buttons
    const skipButtons = screen.getAllByTestId('skip-topic-button');
    expect(skipButtons.length).toBeGreaterThan(0);

    // Click skip on the first pending topic
    await fireEvent.click(skipButtons[0]);

    // Verify PATCH request was made to update status to skipped
    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/topics/topic-2', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'skipped' })
    });
  });

  it('variety memory viewer shows canonical lines with linked content', async () => {
    const TopicsPage = (await import('./+page.svelte')).default;

    render(TopicsPage, {
      props: {
        data: {
          topics: mockTopics,
          varietyMemory: mockVarietyMemory
        }
      }
    });

    // Click on the variety memory tab/section
    const varietyTab = screen.getByTestId('tab-variety-memory');
    await fireEvent.click(varietyTab);

    // Variety memory items should be visible
    const memoryItems = screen.getAllByTestId('variety-memory-item');
    expect(memoryItems).toHaveLength(2);

    // First item has linked content
    const firstItem = memoryItems[0];
    expect(within(firstItem).getByTestId('canonical-line')).toHaveTextContent(
      'In the ever-evolving landscape of digital marketing'
    );
    expect(within(firstItem).getByTestId('content-link')).toBeInTheDocument();

    // Second item has no linked content
    const secondItem = memoryItems[1];
    expect(within(secondItem).getByTestId('canonical-line')).toHaveTextContent(
      'As businesses continue to embrace AI-powered solutions'
    );
    expect(within(secondItem).queryByTestId('content-link')).not.toBeInTheDocument();
  });
});
