/**
 * @behavior Agent edit page loads a single writing agent by id and renders an edit form.
 * Save calls PATCH /api/v1/writing-agents/:id with all editable fields.
 * @business_rule Users can edit name, description, model, system_prompt, and is_active
 * for an existing writing agent. 404 is shown for invalid agent ids.
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

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => ({}))
}));

const mockLoaderSelect = vi.fn();
const mockLoaderEq = vi.fn();
const mockLoaderSingle = vi.fn();

const mockLoaderSupabase = {
  from: vi.fn(() => ({
    select: mockLoaderSelect
  }))
};

mockLoaderSelect.mockReturnValue({ eq: mockLoaderEq });
mockLoaderEq.mockReturnValue({ single: mockLoaderSingle });

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockLoaderSupabase),
  createServiceRoleClient: vi.fn()
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockAgent = {
  id: 'agent-1',
  project_id: 'proj-1',
  name: 'The Analyst',
  description: 'Writes data-driven articles',
  model: 'anthropic/claude-sonnet-4-6',
  system_prompt: 'You are a data analyst...',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

describe('Agent Edit Page Loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoaderSupabase.from.mockReturnValue({ select: mockLoaderSelect });
    mockLoaderSelect.mockReturnValue({ eq: mockLoaderEq });
    mockLoaderEq.mockReturnValue({ single: mockLoaderSingle });
  });

  it('fetches single writing agent by id from Supabase', async () => {
    mockLoaderSingle.mockResolvedValueOnce({ data: mockAgent, error: null });

    const { load } = await import('./+page.server');

    const result = await load({
      params: { id: 'agent-1' },
      parent: vi.fn().mockResolvedValue({ projects: [{ id: 'proj-1' }] }),
      cookies: {} as never
    } as never);

    expect(mockLoaderSupabase.from).toHaveBeenCalledWith('writing_agents');
    expect(mockLoaderEq).toHaveBeenCalledWith('id', 'agent-1');
    expect(result).toEqual({ agent: mockAgent, projectId: 'proj-1' });
  });

  it('returns agent as null when agent not found', async () => {
    mockLoaderSingle.mockResolvedValueOnce({ data: null, error: null });

    const { load } = await import('./+page.server');

    const result = await load({
      params: { id: 'nonexistent' },
      parent: vi.fn().mockResolvedValue({ projects: [{ id: 'proj-1' }] }),
      cookies: {} as never
    } as never);

    expect(result).toEqual({ agent: null, projectId: 'proj-1' });
  });
});

describe('Agents List Page - Edit Link', () => {
  it('renders an Edit link on each agent card pointing to /dashboard/write/agents/:id', async () => {
    const AgentsListPage = (await import('../+page.svelte')).default;
    render(AgentsListPage, {
      props: {
        data: {
          writingAgents: [mockAgent, { ...mockAgent, id: 'agent-2', name: 'The Writer' }]
        }
      }
    });

    const editLinks = screen.getAllByRole('link', { name: /edit/i });
    expect(editLinks).toHaveLength(2);
    expect(editLinks[0]).toHaveAttribute('href', '/dashboard/write/agents/agent-1');
    expect(editLinks[1]).toHaveAttribute('href', '/dashboard/write/agents/agent-2');
  });
});

describe('Agent Edit Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockAgent })
    });
  });

  it('renders edit form with agent data pre-filled', async () => {
    const AgentEditPage = (await import('./+page.svelte')).default;
    render(AgentEditPage, {
      props: { data: { agent: mockAgent, projectId: 'proj-1' } }
    });

    expect(screen.getByTestId('agent-edit-page')).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toHaveValue('The Analyst');
    expect(screen.getByLabelText(/description/i)).toHaveValue('Writes data-driven articles');
    expect(screen.getByLabelText(/model/i)).toHaveValue('anthropic/claude-sonnet-4-6');
    expect(screen.getByLabelText(/system prompt/i)).toHaveValue('You are a data analyst...');
  });

  it('renders is_active toggle checked when agent is active', async () => {
    const AgentEditPage = (await import('./+page.svelte')).default;
    render(AgentEditPage, {
      props: { data: { agent: mockAgent, projectId: 'proj-1' } }
    });

    const toggle = screen.getByLabelText(/active/i) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
  });

  it('shows 404 message when agent is null', async () => {
    const AgentEditPage = (await import('./+page.svelte')).default;
    render(AgentEditPage, {
      props: { data: { agent: null, projectId: 'proj-1' } }
    });

    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });

  it('calls PATCH /api/v1/writing-agents/:id on save', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { ...mockAgent, name: 'Updated Name' } })
    });

    const AgentEditPage = (await import('./+page.svelte')).default;
    render(AgentEditPage, {
      props: { data: { agent: mockAgent, projectId: 'proj-1' } }
    });

    const nameInput = screen.getByLabelText(/name/i);
    await fireEvent.input(nameInput, { target: { value: 'Updated Name' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    await fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/writing-agents/agent-1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('Updated Name')
        })
      );
    });
  });

  it('shows success feedback after saving', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockAgent })
    });

    const AgentEditPage = (await import('./+page.svelte')).default;
    render(AgentEditPage, {
      props: { data: { agent: mockAgent, projectId: 'proj-1' } }
    });

    const saveButton = screen.getByRole('button', { name: /save/i });
    await fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/saved/i)).toBeInTheDocument();
    });
  });

  it('shows error message when save fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Failed to update agent' })
    });

    const AgentEditPage = (await import('./+page.svelte')).default;
    render(AgentEditPage, {
      props: { data: { agent: mockAgent, projectId: 'proj-1' } }
    });

    const saveButton = screen.getByRole('button', { name: /save/i });
    await fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to update agent/i)).toBeInTheDocument();
    });
  });

  it('has a back link to agents list', async () => {
    const AgentEditPage = (await import('./+page.svelte')).default;
    render(AgentEditPage, {
      props: { data: { agent: mockAgent, projectId: 'proj-1' } }
    });

    const backLink = screen.getByRole('link', { name: /back/i });
    expect(backLink).toHaveAttribute('href', '/dashboard/write/agents');
  });
});
