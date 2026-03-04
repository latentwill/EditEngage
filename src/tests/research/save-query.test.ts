/**
 * @behavior Save button on research page creates a new research query via POST
 * @business_rule Users must provide a query name to save; errors are communicated clearly
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

const mockLoadQueries = vi.fn().mockResolvedValue(undefined);

vi.mock('$lib/stores/researchStore', () => ({
  createResearchStore: () => ({
    queries: [],
    loading: false,
    searchTerm: '',
    providerFilter: null,
    statusFilter: null,
    loadQueries: mockLoadQueries,
    searchQueries: vi.fn(),
    filterByProvider: vi.fn(),
    filterByStatus: vi.fn(),
    runQuery: vi.fn(),
    markConsumed: vi.fn(),
  })
}));

vi.mock('$lib/stores/projectStore', () => ({
  createProjectStore: () => ({})
}));

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: () => ({})
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('Research Query Save Button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('should call POST /api/v1/research when save button is clicked', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const ResearchPage = (await import('../../routes/dashboard/research/+page.svelte')).default;
    render(ResearchPage);

    // Open the new query form
    const newQueryBtn = screen.getByTestId('new-query-btn');
    await fireEvent.click(newQueryBtn);

    // Type a query name
    const nameInput = screen.getByTestId('new-query-name-input');
    await fireEvent.input(nameInput, { target: { value: 'My Research Query' } });

    // Click save
    const saveBtn = screen.getByTestId('new-query-save-btn');
    await fireEvent.click(saveBtn);

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Research Query' })
    });
  });

  it('should refresh the query list after successful save', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const ResearchPage = (await import('../../routes/dashboard/research/+page.svelte')).default;
    render(ResearchPage);

    // loadQueries is called once on mount
    mockLoadQueries.mockClear();

    const newQueryBtn = screen.getByTestId('new-query-btn');
    await fireEvent.click(newQueryBtn);

    const nameInput = screen.getByTestId('new-query-name-input');
    await fireEvent.input(nameInput, { target: { value: 'Test Query' } });

    const saveBtn = screen.getByTestId('new-query-save-btn');
    await fireEvent.click(saveBtn);

    // Wait for the async handler to complete
    await vi.waitFor(() => {
      expect(mockLoadQueries).toHaveBeenCalled();
    });
  });

  it('should show error message on save failure', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const ResearchPage = (await import('../../routes/dashboard/research/+page.svelte')).default;
    render(ResearchPage);

    const newQueryBtn = screen.getByTestId('new-query-btn');
    await fireEvent.click(newQueryBtn);

    const nameInput = screen.getByTestId('new-query-name-input');
    await fireEvent.input(nameInput, { target: { value: 'Failing Query' } });

    const saveBtn = screen.getByTestId('new-query-save-btn');
    await fireEvent.click(saveBtn);

    await vi.waitFor(() => {
      const errorEl = screen.getByTestId('new-query-save-error');
      expect(errorEl).toBeInTheDocument();
      expect(errorEl.textContent).toBeTruthy();
    });
  });

  it('should disable save button when name is empty', async () => {
    const ResearchPage = (await import('../../routes/dashboard/research/+page.svelte')).default;
    render(ResearchPage);

    const newQueryBtn = screen.getByTestId('new-query-btn');
    await fireEvent.click(newQueryBtn);

    const saveBtn = screen.getByTestId('new-query-save-btn');
    expect(saveBtn).toBeDisabled();
  });
});
