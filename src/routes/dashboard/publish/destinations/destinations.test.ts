/**
 * @behavior Destinations page renders at /dashboard/publish/destinations with destination cards
 * @business_rule Destination management is part of the Publish workflow, not Settings
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
  createSupabaseClient: vi.fn(() => ({
    auth: { signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), getSession: vi.fn(), getUser: vi.fn() }
  }))
}));
vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({ auth: { getUser: vi.fn() }, from: vi.fn() })),
  createServiceRoleClient: vi.fn(() => ({ auth: { getUser: vi.fn() }, from: vi.fn() }))
}));

import DestinationsPage from './+page.svelte';

const mockDestinations = [
  { id: '1', project_id: 'p1', type: 'ghost' as const, name: 'My Ghost', config: {}, is_active: true, created_at: '', updated_at: '' },
  { id: '2', project_id: 'p1', type: 'postbridge' as const, name: 'My PB', config: {}, is_active: false, created_at: '', updated_at: '' }
];

const defaultData = { destinations: mockDestinations, projectId: 'p1' };

describe('Destinations Page at /dashboard/publish/destinations', () => {
  it('renders destinations page with data-testid', () => {
    render(DestinationsPage, { props: { data: defaultData } });
    expect(screen.getByTestId('destinations-page')).toBeInTheDocument();
  });

  it('renders destination cards with data', () => {
    render(DestinationsPage, { props: { data: defaultData } });
    const cards = screen.getAllByTestId('destination-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('My Ghost')).toBeInTheDocument();
    expect(screen.getByText('My PB')).toBeInTheDocument();
  });

  it('renders with empty destinations array', () => {
    render(DestinationsPage, { props: { data: { destinations: [], projectId: 'p1' } } });
    expect(screen.getByTestId('destinations-page')).toBeInTheDocument();
    expect(screen.queryAllByTestId('destination-card')).toHaveLength(0);
  });

  describe('Ghost form validation', () => {
    beforeEach(async () => {
      render(DestinationsPage, { props: { data: defaultData } });
      const addBtn = screen.getByText('Add Destination');
      await fireEvent.click(addBtn);
    });

    it('shows validation errors when Ghost fields are empty', async () => {
      const saveBtn = screen.getByText('Save Destination');
      await fireEvent.click(saveBtn);
      const errors = screen.getAllByTestId('validation-error');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('validates ghostKey field (not ghostAdminKey)', async () => {
      // Fill name and URL but leave key empty
      await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'My Blog' } });
      await fireEvent.input(screen.getByLabelText('Ghost Blog URL'), { target: { value: 'https://example.com' } });
      const saveBtn = screen.getByText('Save Destination');
      await fireEvent.click(saveBtn);
      const errors = screen.getAllByTestId('validation-error');
      expect(errors.some((e) => e.textContent?.includes('Admin API Key'))).toBe(true);
    });

    it('shows Content API Key label when content key type selected', async () => {
      const contentRadio = screen.getByDisplayValue('content');
      await fireEvent.click(contentRadio);
      expect(screen.getByText('Content API Key')).toBeInTheDocument();
    });
  });

  describe('handleSave sends project_id', () => {
    it('includes project_id in POST body', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ data: { id: '3', project_id: 'p1', type: 'ghost', name: 'New', config: {}, is_active: false, created_at: '', updated_at: '' } }), { status: 201 })
      );

      render(DestinationsPage, { props: { data: defaultData } });
      await fireEvent.click(screen.getByText('Add Destination'));

      await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'New Ghost' } });
      await fireEvent.input(screen.getByLabelText('Ghost Blog URL'), { target: { value: 'https://example.com' } });
      await fireEvent.input(screen.getByLabelText('Admin API Key'), { target: { value: 'abc:def' } });

      await fireEvent.click(screen.getByText('Save Destination'));

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith('/api/v1/destinations', expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"project_id":"p1"')
        }));
      });

      fetchSpy.mockRestore();
    });
  });

  describe('handleSave error handling', () => {
    it('shows save-error when server returns non-2xx', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ error: 'project_id is required' }), { status: 400 })
      );

      render(DestinationsPage, { props: { data: defaultData } });
      await fireEvent.click(screen.getByText('Add Destination'));

      await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'New Ghost' } });
      await fireEvent.input(screen.getByLabelText('Ghost Blog URL'), { target: { value: 'https://example.com' } });
      await fireEvent.input(screen.getByLabelText('Admin API Key'), { target: { value: 'abc:def' } });

      await fireEvent.click(screen.getByText('Save Destination'));

      await waitFor(() => {
        expect(screen.getByTestId('save-error')).toBeInTheDocument();
        expect(screen.getByTestId('save-error').textContent).toContain('project_id is required');
      });

      // Form stays open
      expect(screen.getByText('Save Destination')).toBeInTheDocument();
    });

    it('appends destination and closes form on success', async () => {
      const newDest = { id: '3', project_id: 'p1', type: 'ghost', name: 'New Ghost', config: {}, is_active: false, created_at: '', updated_at: '' };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ data: newDest }), { status: 201 })
      );

      render(DestinationsPage, { props: { data: defaultData } });
      await fireEvent.click(screen.getByText('Add Destination'));

      await fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'New Ghost' } });
      await fireEvent.input(screen.getByLabelText('Ghost Blog URL'), { target: { value: 'https://example.com' } });
      await fireEvent.input(screen.getByLabelText('Admin API Key'), { target: { value: 'abc:def' } });

      await fireEvent.click(screen.getByText('Save Destination'));

      await waitFor(() => {
        expect(screen.queryByText('Save Destination')).not.toBeInTheDocument();
        expect(screen.getByText('New Ghost')).toBeInTheDocument();
      });
    });
  });
});
