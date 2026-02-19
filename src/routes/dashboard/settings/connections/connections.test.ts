/**
 * @behavior Connections page renders AI Providers section with key management.
 * Destination management has been moved to Publish section.
 * @business_rule Users manage AI provider API keys (1:1 per provider) from the
 * Connections page. This page replaces the old Integrations page.
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase env vars
vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
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

describe('Connections Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: {} })
    });
  });

  it('renders connections page with correct testid', async () => {
    const ConnectionsPage = (await import('./+page.svelte')).default;
    render(ConnectionsPage, {
      props: { data: { projectId: 'proj-1', apiKeys: mockApiKeys } }
    });

    expect(screen.getByTestId('connections-page')).toBeInTheDocument();
  });

  it('displays "Connections" heading', async () => {
    const ConnectionsPage = (await import('./+page.svelte')).default;
    render(ConnectionsPage, {
      props: { data: { projectId: 'proj-1', apiKeys: [] } }
    });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Connections');
  });

  it('renders AI Providers section with all 5 provider cards', async () => {
    const ConnectionsPage = (await import('./+page.svelte')).default;
    render(ConnectionsPage, {
      props: { data: { projectId: 'proj-1', apiKeys: mockApiKeys } }
    });

    expect(screen.getByTestId('ai-providers-section')).toBeInTheDocument();
    expect(screen.getByText('OpenRouter')).toBeInTheDocument();
    expect(screen.getByText('Perplexity')).toBeInTheDocument();
    expect(screen.getByText('Tavily')).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('SerpAPI')).toBeInTheDocument();
  });

  it('shows masked key value for configured providers', async () => {
    const ConnectionsPage = (await import('./+page.svelte')).default;
    render(ConnectionsPage, {
      props: { data: { projectId: 'proj-1', apiKeys: mockApiKeys } }
    });

    const openrouterInput = screen.getByTestId('api-key-input-openrouter') as HTMLInputElement;
    expect(openrouterInput.value).toBe('sk-o****f456');
  });

  it('saves API key via POST to /api/v1/api-keys', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'key-new', provider: 'tavily' } })
    });

    const ConnectionsPage = (await import('./+page.svelte')).default;
    render(ConnectionsPage, {
      props: { data: { projectId: 'proj-1', apiKeys: [] } }
    });

    const tavilyInput = screen.getByTestId('api-key-input-tavily');
    await fireEvent.input(tavilyInput, { target: { value: 'tvly-abc123' } });

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

  it('does NOT render destinations section (moved to Publish)', async () => {
    const ConnectionsPage = (await import('./+page.svelte')).default;
    render(ConnectionsPage, {
      props: { data: { projectId: 'proj-1', apiKeys: [] } }
    });

    expect(screen.queryByTestId('destinations-section')).not.toBeInTheDocument();
    expect(screen.queryByText('Publishing Destinations')).not.toBeInTheDocument();
  });
});
