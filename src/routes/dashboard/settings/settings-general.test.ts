/**
 * @behavior Settings General page loads project data and renders an edit form.
 * Save calls PATCH /api/v1/projects/:id with name, description, domain, color.
 * @business_rule Users can edit their project settings from the General page.
 * A danger zone section is present as a placeholder for project deletion.
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

const mockProject = {
  id: 'proj-1',
  org_id: 'org-1',
  name: 'My Blog',
  description: 'A content platform',
  domain: 'myblog.com',
  color: '#3b82f6',
  icon: null,
  settings: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

describe('Settings General Page Loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoaderSupabase.from.mockReturnValue({ select: mockLoaderSelect });
    mockLoaderSelect.mockReturnValue({ eq: mockLoaderEq });
    mockLoaderEq.mockReturnValue({ single: mockLoaderSingle });
  });

  it('fetches project data by active project id', async () => {
    mockLoaderSingle.mockResolvedValueOnce({ data: mockProject, error: null });

    const { load } = await import('./+page.server');

    const result = await load({
      parent: vi.fn().mockResolvedValue({ projects: [{ id: 'proj-1' }] }),
      cookies: {} as never
    } as never);

    expect(mockLoaderSupabase.from).toHaveBeenCalledWith('projects');
    expect(mockLoaderEq).toHaveBeenCalledWith('id', 'proj-1');
    expect(result).toEqual({ project: mockProject, projectId: 'proj-1' });
  });

  it('returns null project when no active project', async () => {
    const { load } = await import('./+page.server');

    const result = await load({
      parent: vi.fn().mockResolvedValue({ projects: [] }),
      cookies: {} as never
    } as never);

    expect(result).toEqual({ project: null, projectId: '' });
    expect(mockLoaderSupabase.from).not.toHaveBeenCalled();
  });
});

describe('Settings General Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockProject })
    });
  });

  it('renders settings page with data-testid and project name pre-filled', async () => {
    const SettingsPage = (await import('./+page.svelte')).default;
    render(SettingsPage, {
      props: { data: { project: mockProject, projectId: 'proj-1' } }
    });

    expect(screen.getByTestId('settings-page')).toBeInTheDocument();
    expect(screen.getByLabelText(/project name/i)).toHaveValue('My Blog');
  });

  it('renders description, domain, and color fields pre-filled', async () => {
    const SettingsPage = (await import('./+page.svelte')).default;
    render(SettingsPage, {
      props: { data: { project: mockProject, projectId: 'proj-1' } }
    });

    expect(screen.getByLabelText(/description/i)).toHaveValue('A content platform');
    expect(screen.getByLabelText(/domain/i)).toHaveValue('myblog.com');
    expect(screen.getByLabelText(/color/i)).toHaveValue('#3b82f6');
  });

  it('calls fetch with PATCH on save', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockProject })
    });

    const SettingsPage = (await import('./+page.svelte')).default;
    render(SettingsPage, {
      props: { data: { project: mockProject, projectId: 'proj-1' } }
    });

    const nameInput = screen.getByLabelText(/project name/i);
    await fireEvent.input(nameInput, { target: { value: 'Updated Blog' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    await fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/projects/proj-1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('Updated Blog')
        })
      );
    });
  });

  it('shows success feedback after saving', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: mockProject })
    });

    const SettingsPage = (await import('./+page.svelte')).default;
    render(SettingsPage, {
      props: { data: { project: mockProject, projectId: 'proj-1' } }
    });

    const saveButton = screen.getByRole('button', { name: /save/i });
    await fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/saved/i)).toBeInTheDocument();
    });
  });

  it('shows error when save fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Update failed' })
    });

    const SettingsPage = (await import('./+page.svelte')).default;
    render(SettingsPage, {
      props: { data: { project: mockProject, projectId: 'proj-1' } }
    });

    const saveButton = screen.getByRole('button', { name: /save/i });
    await fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/update failed/i)).toBeInTheDocument();
    });
  });

  it('renders danger zone section', async () => {
    const SettingsPage = (await import('./+page.svelte')).default;
    render(SettingsPage, {
      props: { data: { project: mockProject, projectId: 'proj-1' } }
    });

    expect(screen.getByTestId('danger-zone')).toBeInTheDocument();
    expect(screen.getByText(/danger zone/i)).toBeInTheDocument();
  });

  it('shows placeholder state when no project loaded', async () => {
    const SettingsPage = (await import('./+page.svelte')).default;
    render(SettingsPage, {
      props: { data: { project: null, projectId: '' } }
    });

    expect(screen.getByTestId('settings-page')).toBeInTheDocument();
    expect(screen.getByText(/no project/i)).toBeInTheDocument();
  });
});
