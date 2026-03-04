/**
 * @behavior Delete workflow button shows confirmation before deleting, calls DELETE API,
 * and redirects to workflow list on success.
 * @business_rule Users must confirm deletion to prevent accidental data loss.
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

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn()
};

const mockSupabaseClient = {
  channel: vi.fn().mockReturnValue(mockChannel),
  removeChannel: vi.fn(),
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({ data: [], error: null })
      })
    })
  })
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => mockSupabaseClient)
}));

const mockGoto = vi.fn();
vi.mock('$app/navigation', () => ({
  goto: mockGoto
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockWorkflow = {
  id: 'wf-delete-test',
  project_id: 'proj-1',
  name: 'Delete Test Workflow',
  description: 'A workflow to test delete behavior',
  schedule: null,
  review_mode: 'draft_for_review' as const,
  is_active: true,
  steps: [{ agentType: 'researcher', config: {} }],
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  last_run_at: null
};

describe('Workflow Detail Delete button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render delete button on workflow detail page', async () => {
    const WorkflowDetailPage = (await import('./+page.svelte')).default;
    render(WorkflowDetailPage, {
      props: { data: { workflow: mockWorkflow, runs: [] } }
    });

    const deleteButton = screen.getByTestId('workflow-delete-button');
    expect(deleteButton).toBeInTheDocument();
  });

  it('should show confirmation dialog when delete clicked', async () => {
    const WorkflowDetailPage = (await import('./+page.svelte')).default;
    render(WorkflowDetailPage, {
      props: { data: { workflow: mockWorkflow, runs: [] } }
    });

    const deleteButton = screen.getByTestId('workflow-delete-button');
    await fireEvent.click(deleteButton);

    await waitFor(() => {
      const confirmDialog = screen.getByTestId('delete-confirm-dialog');
      expect(confirmDialog).toBeInTheDocument();
      expect(confirmDialog.textContent).toContain('Delete');
    });
  });

  it('should call DELETE API and redirect on confirm', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    const WorkflowDetailPage = (await import('./+page.svelte')).default;
    render(WorkflowDetailPage, {
      props: { data: { workflow: mockWorkflow, runs: [] } }
    });

    const deleteButton = screen.getByTestId('workflow-delete-button');
    await fireEvent.click(deleteButton);

    await waitFor(() => {
      const confirmButton = screen.getByTestId('delete-confirm-button');
      return fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/v1/workflows/${mockWorkflow.id}`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    await waitFor(() => {
      expect(mockGoto).toHaveBeenCalledWith('/dashboard/workflows');
    });
  });
});
