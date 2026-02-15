/**
 * @behavior Integrations page renders AI Providers section with key management
 * and Publishing Destinations section with destination card list and add form
 * @business_rule Users manage both AI provider API keys (1:1 per provider)
 * and publishing destinations (1:many) from a single integrations page
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase env vars
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

// Mock fetch for API calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockApiKeys = [
  {
    id: 'key-1',
    project_id: 'proj-1',
    provider: 'openrouter' as const,
    api_key: 'sk-o****f456',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'key-2',
    project_id: 'proj-1',
    provider: 'perplexity' as const,
    api_key: 'pplx****mnop',
    is_active: true,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  }
];

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

describe('Integrations Page - AI Providers Section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: {} })
    });
  });

  it('renders AI Providers section with all 5 provider cards', async () => {
    const IntegrationsPage = (await import('./+page.svelte')).default;
    render(IntegrationsPage, {
      props: { data: { projectId: 'proj-1', apiKeys: mockApiKeys, destinations: mockDestinations } }
    });

    expect(screen.getByTestId('ai-providers-section')).toBeInTheDocument();
    expect(screen.getByText('OpenRouter')).toBeInTheDocument();
    expect(screen.getByText('Perplexity')).toBeInTheDocument();
    expect(screen.getByText('Tavily')).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('SerpAPI')).toBeInTheDocument();
  });

  it('shows masked key value for configured providers', async () => {
    const IntegrationsPage = (await import('./+page.svelte')).default;
    render(IntegrationsPage, {
      props: { data: { projectId: 'proj-1', apiKeys: mockApiKeys, destinations: [] } }
    });

    // OpenRouter has a configured key
    const openrouterInput = screen.getByTestId('api-key-input-openrouter') as HTMLInputElement;
    expect(openrouterInput.value).toBe('sk-o****f456');
  });

  it('saves API key via POST to /api/v1/api-keys', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'key-new', provider: 'tavily' } })
    });

    const IntegrationsPage = (await import('./+page.svelte')).default;
    render(IntegrationsPage, {
      props: { data: { projectId: 'proj-1', apiKeys: [], destinations: [] } }
    });

    // Type a key into the Tavily input
    const tavilyInput = screen.getByTestId('api-key-input-tavily');
    await fireEvent.input(tavilyInput, { target: { value: 'tvly-abc123' } });

    // Click save button
    const saveButton = screen.getByTestId('api-key-save-tavily');
    await fireEvent.click(saveButton);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/api-keys',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('tavily')
      })
    );
  });
});

describe('Integrations Page - Publishing Destinations Section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: {} })
    });
  });

  it('renders destinations section with destination cards', async () => {
    const IntegrationsPage = (await import('./+page.svelte')).default;
    render(IntegrationsPage, {
      props: { data: { projectId: 'proj-1', apiKeys: [], destinations: mockDestinations } }
    });

    expect(screen.getByTestId('destinations-section')).toBeInTheDocument();
    expect(screen.getByText('My Ghost Blog')).toBeInTheDocument();
    expect(screen.getByText('Post Bridge Prod')).toBeInTheDocument();
  });

  it('shows destination type and status badges', async () => {
    const IntegrationsPage = (await import('./+page.svelte')).default;
    render(IntegrationsPage, {
      props: { data: { projectId: 'proj-1', apiKeys: [], destinations: mockDestinations } }
    });

    expect(screen.getByText('ghost')).toBeInTheDocument();
    expect(screen.getByText('postbridge')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('inactive')).toBeInTheDocument();
  });

  it('has an Add Destination button that reveals a form', async () => {
    const IntegrationsPage = (await import('./+page.svelte')).default;
    render(IntegrationsPage, {
      props: { data: { projectId: 'proj-1', apiKeys: [], destinations: [] } }
    });

    const addButton = screen.getByRole('button', { name: /add destination/i });
    await fireEvent.click(addButton);

    expect(screen.getByLabelText(/destination type/i)).toBeInTheDocument();
  });

  it('creates destination via POST to /api/v1/destinations', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'new-dest' } })
    });

    const IntegrationsPage = (await import('./+page.svelte')).default;
    render(IntegrationsPage, {
      props: { data: { projectId: 'proj-1', apiKeys: [], destinations: [] } }
    });

    // Open form
    const addButton = screen.getByRole('button', { name: /add destination/i });
    await fireEvent.click(addButton);

    // Select Ghost type
    const typeSelect = screen.getByLabelText(/destination type/i);
    await fireEvent.change(typeSelect, { target: { value: 'ghost' } });

    // Fill in fields
    const nameInput = screen.getByLabelText(/^name$/i);
    await fireEvent.input(nameInput, { target: { value: 'New Blog' } });

    const urlInput = screen.getByLabelText(/api url/i);
    await fireEvent.input(urlInput, { target: { value: 'https://blog.example.com' } });

    const keyInput = screen.getByLabelText(/admin key/i);
    await fireEvent.input(keyInput, { target: { value: 'ghost-key-123' } });

    // Submit
    const saveButton = screen.getByRole('button', { name: /save destination/i });
    await fireEvent.click(saveButton);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/destinations',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          project_id: 'proj-1',
          type: 'ghost',
          name: 'New Blog',
          config: {
            api_url: 'https://blog.example.com',
            admin_key: 'ghost-key-123'
          }
        })
      })
    );
  });
});
