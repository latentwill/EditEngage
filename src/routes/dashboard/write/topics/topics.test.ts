/**
 * @behavior Topics page displays queue management UI with tabs for
 * Pending, Completed, and Skipped topics; supports adding, importing,
 * skipping topics; and viewing variety memory
 * @business_rule Users manage their topic queue to control which content
 * gets produced — topics can be added manually or via CSV import,
 * skipped to remove from active queue, and variety memory prevents
 * duplicate content lines. All mutations require project_id to scope
 * topics to the correct project.
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

// --- Supabase mock builder for server loader tests ---

function createChainMock(terminalValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(terminalValue);
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(terminalValue));
  return chain;
}

let mockTopicChain: ReturnType<typeof createChainMock>;
let mockVarietyChain: ReturnType<typeof createChainMock>;
let mockAuthUser: { id: string } | null = { id: 'user-1' };
let mockInsertChain: ReturnType<typeof createChainMock>;

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({
      data: { user: mockAuthUser },
      error: mockAuthUser ? null : { message: 'Not authenticated' }
    }))
  },
  from: vi.fn((table: string) => {
    if (table === 'topic_queue') return mockTopicChain;
    if (table === 'variety_memory') return mockVarietyChain;
    return mockTopicChain;
  })
};

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
  createServiceRoleClient: vi.fn(() => mockSupabase)
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
          varietyMemory: mockVarietyMemory,
          projectId: 'proj-1'
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
          varietyMemory: mockVarietyMemory,
          projectId: 'proj-1'
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

  it('"Add Topic" form sends project_id in POST body', async () => {
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
          varietyMemory: mockVarietyMemory,
          projectId: 'proj-1'
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

    // Verify fetch was called with project_id included
    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Topic Title',
        keywords: ['keyword1', 'keyword2'],
        notes: 'Some notes',
        project_id: 'proj-1'
      })
    });
  });

  it('CSV import sends project_id in FormData alongside the file', async () => {
    const TopicsPage = (await import('./+page.svelte')).default;

    let capturedFormData: FormData | null = null;
    const fetchSpy = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      if (init.body instanceof FormData) {
        capturedFormData = init.body;
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: {
            imported: 3,
            skipped: 1,
            errors: ['Row 4: missing title']
          }
        })
      });
    });
    vi.stubGlobal('fetch', fetchSpy);

    render(TopicsPage, {
      props: {
        data: {
          topics: mockTopics,
          varietyMemory: mockVarietyMemory,
          projectId: 'proj-1'
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

    // Verify project_id was included in FormData
    expect(capturedFormData).not.toBeNull();
    expect(capturedFormData!.get('project_id')).toBe('proj-1');
    expect(capturedFormData!.get('file')).toBeInstanceOf(File);

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
          varietyMemory: mockVarietyMemory,
          projectId: 'proj-1'
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

  it('variety memory parses canonical_line into labeled parts', async () => {
    const TopicsPage = (await import('./+page.svelte')).default;

    const pipeMemory = [
      {
        id: 'vm-pipe-1',
        project_id: 'proj-1',
        canonical_line: 'inform | diabetes | patient perspective',
        content_id: null,
        created_at: '2025-01-12T10:00:00Z'
      }
    ];

    render(TopicsPage, {
      props: {
        data: {
          topics: mockTopics,
          varietyMemory: pipeMemory,
          projectId: 'proj-1'
        }
      }
    });

    const varietyTab = screen.getByTestId('tab-variety-memory');
    await fireEvent.click(varietyTab);

    const item = screen.getByTestId('variety-memory-item');
    expect(within(item).getByTestId('line-intent')).toHaveTextContent('Intent: inform');
    expect(within(item).getByTestId('line-entity')).toHaveTextContent('Entity: diabetes');
    expect(within(item).getByTestId('line-angle')).toHaveTextContent('Angle: patient perspective');
  });

  it('variety memory shows relative timestamps', async () => {
    const TopicsPage = (await import('./+page.svelte')).default;

    // Set "now" to a known time so we can assert relative text
    const now = new Date('2025-01-14T10:00:00Z').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const recentMemory = [
      {
        id: 'vm-recent',
        project_id: 'proj-1',
        canonical_line: 'inform | topic | angle',
        content_id: null,
        created_at: '2025-01-12T10:00:00Z' // 2 days before "now"
      }
    ];

    render(TopicsPage, {
      props: {
        data: {
          topics: mockTopics,
          varietyMemory: recentMemory,
          projectId: 'proj-1'
        }
      }
    });

    const varietyTab = screen.getByTestId('tab-variety-memory');
    await fireEvent.click(varietyTab);

    const item = screen.getByTestId('variety-memory-item');
    expect(within(item).getByTestId('relative-time')).toHaveTextContent('2 days ago');

    vi.restoreAllMocks();
  });

  it('variety memory shows explanatory info text', async () => {
    const TopicsPage = (await import('./+page.svelte')).default;

    render(TopicsPage, {
      props: {
        data: {
          topics: mockTopics,
          varietyMemory: mockVarietyMemory,
          projectId: 'proj-1'
        }
      }
    });

    const varietyTab = screen.getByTestId('tab-variety-memory');
    await fireEvent.click(varietyTab);

    const info = screen.getByTestId('variety-memory-info');
    expect(info).toBeInTheDocument();
    expect(info.textContent).toContain('tracks');
    expect(info.textContent).toContain('fresh');
  });

  it('variety memory shows entry count', async () => {
    const TopicsPage = (await import('./+page.svelte')).default;

    const threeItems = [
      { id: 'vm-a', project_id: 'proj-1', canonical_line: 'a | b | c', content_id: null, created_at: '2025-01-12T10:00:00Z' },
      { id: 'vm-b', project_id: 'proj-1', canonical_line: 'd | e | f', content_id: null, created_at: '2025-01-11T10:00:00Z' },
      { id: 'vm-c', project_id: 'proj-1', canonical_line: 'g | h | i', content_id: null, created_at: '2025-01-10T10:00:00Z' }
    ];

    render(TopicsPage, {
      props: {
        data: {
          topics: mockTopics,
          varietyMemory: threeItems,
          projectId: 'proj-1'
        }
      }
    });

    const varietyTab = screen.getByTestId('tab-variety-memory');
    await fireEvent.click(varietyTab);

    expect(screen.getByTestId('variety-memory-count')).toHaveTextContent('3 entries');
  });

  it('variety memory handles single-part canonical_line gracefully', async () => {
    const TopicsPage = (await import('./+page.svelte')).default;

    const singlePartMemory = [
      {
        id: 'vm-single',
        project_id: 'proj-1',
        canonical_line: 'just some text',
        content_id: null,
        created_at: '2025-01-12T10:00:00Z'
      }
    ];

    render(TopicsPage, {
      props: {
        data: {
          topics: mockTopics,
          varietyMemory: singlePartMemory,
          projectId: 'proj-1'
        }
      }
    });

    const varietyTab = screen.getByTestId('tab-variety-memory');
    await fireEvent.click(varietyTab);

    const item = screen.getByTestId('variety-memory-item');
    // Should render without crashing - show the raw text in canonical-line
    expect(within(item).getByTestId('canonical-line')).toHaveTextContent('just some text');
    // Should NOT have labeled parts since there are no pipes
    expect(within(item).queryByTestId('line-intent')).not.toBeInTheDocument();
    expect(within(item).queryByTestId('line-entity')).not.toBeInTheDocument();
    expect(within(item).queryByTestId('line-angle')).not.toBeInTheDocument();
  });

  it('variety memory viewer shows canonical lines with linked content', async () => {
    const TopicsPage = (await import('./+page.svelte')).default;

    render(TopicsPage, {
      props: {
        data: {
          topics: mockTopics,
          varietyMemory: mockVarietyMemory,
          projectId: 'proj-1'
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

describe('Topics Server Loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockTopicChain = createChainMock({ data: mockTopics, error: null });
    mockVarietyChain = createChainMock({ data: mockVarietyMemory, error: null });
  });

  it('returns projectId alongside topics and varietyMemory', async () => {
    const { load } = await import('./+page.server.js');

    const mockCookies = {
      getAll: vi.fn().mockReturnValue([]),
      set: vi.fn()
    };

    const result = await load({
      parent: () => Promise.resolve({ projects: [{ id: 'proj-1' }] }),
      cookies: mockCookies
    } as never);

    expect(result).toHaveProperty('projectId', 'proj-1');
    expect(result).toHaveProperty('topics');
    expect(result).toHaveProperty('varietyMemory');
  });

  it('returns empty projectId when no projects exist', async () => {
    const { load } = await import('./+page.server.js');

    const mockCookies = {
      getAll: vi.fn().mockReturnValue([]),
      set: vi.fn()
    };

    const result = await load({
      parent: () => Promise.resolve({ projects: [] }),
      cookies: mockCookies
    } as never);

    expect(result).toHaveProperty('projectId', '');
    expect(result).toHaveProperty('topics', []);
    expect(result).toHaveProperty('varietyMemory', []);
  });
});

describe('POST /api/v1/topics/import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: 'user-1' };
    mockInsertChain = createChainMock({ data: [{ id: 'topic-new' }], error: null });
    mockTopicChain = mockInsertChain;
  });

  /** Creates a File-like object with working .text() for jsdom compatibility */
  function makeTextFile(content: string, name: string): File {
    const file = new File([content], name, { type: 'text/csv' });
    // jsdom File doesn't implement .text(), so we add it
    if (typeof file.text !== 'function') {
      Object.defineProperty(file, 'text', {
        value: () => Promise.resolve(content)
      });
    }
    return file;
  }

  function makeFormDataRequest(formData: FormData): Request {
    // jsdom's Request doesn't auto-set multipart Content-Type from FormData,
    // so we create a request with a working formData() method
    const request = new Request('http://localhost/api/v1/topics/import', {
      method: 'POST'
    });
    // Override formData() to return our prepared FormData
    Object.defineProperty(request, 'formData', {
      value: () => Promise.resolve(formData)
    });
    return request;
  }

  it('parses CSV and creates topics with provided project_id', async () => {
    const { POST } = await import('../../../api/v1/topics/import/+server.js');

    const csvContent = 'title,keywords,notes\nTopic A,"kw1,kw2",note A\nTopic B,kw3,';
    const file = makeTextFile(csvContent, 'topics.csv');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', 'proj-1');

    const request = makeFormDataRequest(formData);

    const response = await POST({
      request,
      cookies: { getAll: vi.fn().mockReturnValue([]), set: vi.fn() }
    } as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveProperty('imported');
    expect(json.data.imported).toBe(2);
  });

  it('returns 400 when project_id is missing from FormData', async () => {
    const { POST } = await import('../../../api/v1/topics/import/+server.js');

    const csvContent = 'title,keywords,notes\nTopic A,kw1,note';
    const file = makeTextFile(csvContent, 'topics.csv');
    const formData = new FormData();
    formData.append('file', file);
    // No project_id appended

    const request = makeFormDataRequest(formData);

    const response = await POST({
      request,
      cookies: { getAll: vi.fn().mockReturnValue([]), set: vi.fn() }
    } as never);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toContain('project_id');
  });

  it('returns 401 when user is not authenticated', async () => {
    mockAuthUser = null;

    const { POST } = await import('../../../api/v1/topics/import/+server.js');

    const csvContent = 'title,keywords,notes\nTopic A,kw1,note';
    const file = makeTextFile(csvContent, 'topics.csv');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', 'proj-1');

    const request = makeFormDataRequest(formData);

    const response = await POST({
      request,
      cookies: { getAll: vi.fn().mockReturnValue([]), set: vi.fn() }
    } as never);

    expect(response.status).toBe(401);
  });
});
