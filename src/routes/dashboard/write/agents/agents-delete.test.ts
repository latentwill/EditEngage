/**
 * @behavior Delete button on agent cards triggers confirmation modal and removes agent on confirm
 * @business_rule Users must confirm before deleting an agent; deletion is irreversible
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));
vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));
vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => ({
    auth: { signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), getSession: vi.fn(), getUser: vi.fn() }
  }))
}));
vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({ auth: { getUser: vi.fn() }, from: vi.fn() })),
  createServiceRoleClient: vi.fn(() => ({ auth: { getUser: vi.fn() }, from: vi.fn() }))
}));

import AgentsPage from './+page.svelte';

const AGENT_1 = {
  id: 'agent-1',
  name: 'The Analyst',
  description: 'Deep dives into data',
  model: 'anthropic/claude-sonnet-4-6',
  is_active: true,
  system_prompt: 'You are an analyst.',
  project_id: 'proj-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
};

const AGENT_2 = {
  id: 'agent-2',
  name: 'The Storyteller',
  description: 'Narrative style',
  model: 'openai/gpt-4o',
  is_active: false,
  system_prompt: null,
  project_id: 'proj-1',
  created_at: '2026-01-02T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z'
};

function renderPage(agents = [AGENT_1, AGENT_2]) {
  return render(AgentsPage, {
    props: {
      data: {
        writingAgents: agents,
        agentContextMap: {}
      }
    }
  });
}

describe('Agent delete UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('renders a delete button on each agent card', () => {
    renderPage();

    const deleteButtons = screen.getAllByTestId('delete-agent-button');
    expect(deleteButtons).toHaveLength(2);
  });

  it('shows confirmation modal when delete button is clicked', async () => {
    renderPage();

    expect(screen.queryByTestId('delete-confirm-modal')).not.toBeInTheDocument();

    const deleteButtons = screen.getAllByTestId('delete-agent-button');
    await fireEvent.click(deleteButtons[0]);

    expect(screen.getByTestId('delete-confirm-modal')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-delete-button')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-delete-button')).toBeInTheDocument();
  });

  it('closes modal when cancel is clicked', async () => {
    renderPage();

    const deleteButtons = screen.getAllByTestId('delete-agent-button');
    await fireEvent.click(deleteButtons[0]);

    expect(screen.getByTestId('delete-confirm-modal')).toBeInTheDocument();

    await fireEvent.click(screen.getByTestId('cancel-delete-button'));

    expect(screen.queryByTestId('delete-confirm-modal')).not.toBeInTheDocument();
  });

  it('calls DELETE API and removes agent from list on confirm', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    vi.stubGlobal('fetch', fetchMock);

    renderPage();

    // Verify 2 agent cards initially
    expect(screen.getAllByTestId('agent-card')).toHaveLength(2);

    // Click delete on first agent
    const deleteButtons = screen.getAllByTestId('delete-agent-button');
    await fireEvent.click(deleteButtons[0]);

    // Confirm deletion
    await fireEvent.click(screen.getByTestId('confirm-delete-button'));

    // Verify fetch was called with DELETE method
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/writing-agents/${AGENT_1.id}`,
      expect.objectContaining({ method: 'DELETE' })
    );

    // Agent should be removed from the list
    expect(screen.getAllByTestId('agent-card')).toHaveLength(1);
    expect(screen.queryByTestId('delete-confirm-modal')).not.toBeInTheDocument();
  });
});
