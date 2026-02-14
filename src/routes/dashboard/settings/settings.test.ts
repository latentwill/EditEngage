/**
 * @behavior Settings pages render destinations, writing styles, and API key management
 * with forms that validate input and persist changes via Supabase API
 * @business_rule Project settings must be configurable for destinations (Ghost, Post Bridge),
 * writing styles (tone, guidelines), and API keys to enable content publishing
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase env vars
vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

// Build the chainable Supabase query builder mock
function createQueryMock(resolvedValue: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolvedValue),
    then: vi.fn((resolve: (val: unknown) => void) => resolve(resolvedValue))
  };
  // Make the chain itself thenable so await works
  const proxy = new Proxy(chain, {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: (val: unknown) => void, reject: (val: unknown) => void) => {
          return Promise.resolve(resolvedValue).then(resolve, reject);
        };
      }
      return target[prop as keyof typeof target];
    }
  });
  return proxy;
}

const mockDestinations = [
  {
    id: 'dest-1',
    project_id: 'proj-1',
    type: 'ghost' as const,
    name: 'My Ghost Blog',
    config: { api_url: 'https://blog.example.com', admin_key: 'abc123' },
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'dest-2',
    project_id: 'proj-1',
    type: 'postbridge' as const,
    name: 'Post Bridge Prod',
    config: { api_key: 'pb-key', account_id: 'acc-1' },
    is_active: false,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  }
];

const mockWritingStyles = [
  {
    id: 'ws-1',
    project_id: 'proj-1',
    name: 'Casual Blog',
    tone: 'conversational',
    voice_guidelines: 'Friendly and approachable',
    avoid_phrases: ['synergy', 'leverage'],
    example_content: 'Hey there, let me tell you about...',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'ws-2',
    project_id: 'proj-1',
    name: 'Technical Docs',
    tone: 'technical',
    voice_guidelines: 'Precise and detailed',
    avoid_phrases: ['simply', 'just'],
    example_content: 'This implementation uses...',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  }
];

let destinationsFromMock = { data: mockDestinations, error: null };
let writingStylesFromMock = { data: mockWritingStyles, error: null };
let insertDestinationResult = { data: { id: 'new-dest' }, error: null };
let insertWritingStyleResult = { data: { id: 'new-ws' }, error: null };

const mockSupabaseClient = {
  from: vi.fn((table: string) => {
    if (table === 'destinations') {
      return createQueryMock(destinationsFromMock);
    }
    if (table === 'writing_styles') {
      return createQueryMock(writingStylesFromMock);
    }
    return createQueryMock({ data: null, error: null });
  }),
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null
    })
  }
};

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => mockSupabaseClient)
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('Destinations Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    destinationsFromMock = { data: mockDestinations, error: null };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockDestinations })
    });
  });

  it('lists configured destinations with type and status', async () => {
    const DestinationsPage = (await import('./destinations/+page.svelte')).default;
    render(DestinationsPage, { props: { data: { destinations: mockDestinations } } });

    // Should display destination names
    expect(screen.getByText('My Ghost Blog')).toBeInTheDocument();
    expect(screen.getByText('Post Bridge Prod')).toBeInTheDocument();

    // Should display destination types
    expect(screen.getByText('ghost')).toBeInTheDocument();
    expect(screen.getByText('postbridge')).toBeInTheDocument();

    // Should display status badges
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('inactive')).toBeInTheDocument();
  });

  it('validates Ghost destination form requires API URL and admin key', async () => {
    const DestinationsPage = (await import('./destinations/+page.svelte')).default;
    render(DestinationsPage, { props: { data: { destinations: [] } } });

    // Click add destination button
    const addButton = screen.getByRole('button', { name: /add destination/i });
    await fireEvent.click(addButton);

    // Select Ghost type
    const typeSelect = screen.getByLabelText(/destination type/i);
    await fireEvent.change(typeSelect, { target: { value: 'ghost' } });

    // Try to submit without filling fields
    const saveButton = screen.getByRole('button', { name: /save destination/i });
    await fireEvent.click(saveButton);

    // Should show validation messages
    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/api url is required/i)).toBeInTheDocument();
    expect(screen.getByText(/admin key is required/i)).toBeInTheDocument();
  });

  it('validates Post Bridge destination form requires API credentials', async () => {
    const DestinationsPage = (await import('./destinations/+page.svelte')).default;
    render(DestinationsPage, { props: { data: { destinations: [] } } });

    // Click add destination button
    const addButton = screen.getByRole('button', { name: /add destination/i });
    await fireEvent.click(addButton);

    // Select Post Bridge type
    const typeSelect = screen.getByLabelText(/destination type/i);
    await fireEvent.change(typeSelect, { target: { value: 'postbridge' } });

    // Try to submit without filling fields
    const saveButton = screen.getByRole('button', { name: /save destination/i });
    await fireEvent.click(saveButton);

    // Should show validation messages
    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/api key is required/i)).toBeInTheDocument();
    expect(screen.getByText(/account id is required/i)).toBeInTheDocument();
  });

  it('Test Connection button calls destination health-check endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'ok' })
    });

    const DestinationsPage = (await import('./destinations/+page.svelte')).default;
    render(DestinationsPage, { props: { data: { destinations: mockDestinations } } });

    // Click Test Connection on first destination
    const testButtons = screen.getAllByRole('button', { name: /test connection/i });
    await fireEvent.click(testButtons[0]);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/destinations/dest-1/health',
      expect.objectContaining({ method: 'POST' })
    );
  });
});

describe('Writing Styles Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writingStylesFromMock = { data: mockWritingStyles, error: null };
  });

  it('lists styles with name and tone', async () => {
    const WritingStylesPage = (await import('./writing-styles/+page.svelte')).default;
    render(WritingStylesPage, { props: { data: { writingStyles: mockWritingStyles } } });

    // Should display style names
    expect(screen.getByText('Casual Blog')).toBeInTheDocument();
    expect(screen.getByText('Technical Docs')).toBeInTheDocument();

    // Should display tones
    expect(screen.getByText('conversational')).toBeInTheDocument();
    expect(screen.getByText('technical')).toBeInTheDocument();
  });

  it('create writing style form saves name, tone, guidelines, avoid phrases, example', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'new-ws' } })
    });

    const WritingStylesPage = (await import('./writing-styles/+page.svelte')).default;
    render(WritingStylesPage, { props: { data: { writingStyles: [] } } });

    // Click create style button
    const createButton = screen.getByRole('button', { name: /create style/i });
    await fireEvent.click(createButton);

    // Fill in form fields
    const nameInput = screen.getByLabelText(/style name/i);
    await fireEvent.input(nameInput, { target: { value: 'My New Style' } });

    const toneSelect = screen.getByLabelText(/tone/i);
    await fireEvent.change(toneSelect, { target: { value: 'playful' } });

    const guidelinesInput = screen.getByLabelText(/voice guidelines/i);
    await fireEvent.input(guidelinesInput, { target: { value: 'Be fun and engaging' } });

    const avoidInput = screen.getByLabelText(/avoid phrases/i);
    await fireEvent.input(avoidInput, { target: { value: 'synergy, leverage, pivot' } });

    const exampleInput = screen.getByLabelText(/example content/i);
    await fireEvent.input(exampleInput, { target: { value: 'Check this out!' } });

    // Submit form
    const saveButton = screen.getByRole('button', { name: /save style/i });
    await fireEvent.click(saveButton);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/writing-styles',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'My New Style',
          tone: 'playful',
          voice_guidelines: 'Be fun and engaging',
          avoid_phrases: ['synergy', 'leverage', 'pivot'],
          example_content: 'Check this out!'
        })
      })
    );
  });
});

describe('Settings Save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists destination changes to Supabase via API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'new-dest' } })
    });

    const DestinationsPage = (await import('./destinations/+page.svelte')).default;
    render(DestinationsPage, { props: { data: { destinations: [] } } });

    // Open add form
    const addButton = screen.getByRole('button', { name: /add destination/i });
    await fireEvent.click(addButton);

    // Select Ghost type
    const typeSelect = screen.getByLabelText(/destination type/i);
    await fireEvent.change(typeSelect, { target: { value: 'ghost' } });

    // Fill in fields
    const nameInput = screen.getByLabelText(/^name$/i);
    await fireEvent.input(nameInput, { target: { value: 'New Ghost Blog' } });

    const urlInput = screen.getByLabelText(/api url/i);
    await fireEvent.input(urlInput, { target: { value: 'https://new-blog.example.com' } });

    const keyInput = screen.getByLabelText(/admin key/i);
    await fireEvent.input(keyInput, { target: { value: 'ghost-admin-key-123' } });

    // Submit
    const saveButton = screen.getByRole('button', { name: /save destination/i });
    await fireEvent.click(saveButton);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/destinations',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          type: 'ghost',
          name: 'New Ghost Blog',
          config: {
            api_url: 'https://new-blog.example.com',
            admin_key: 'ghost-admin-key-123'
          }
        })
      })
    );
  });
});
