/**
 * @behavior Test Connection captures health check response and displays result badge
 * @business_rule Users need visual feedback on whether a destination is healthy
 * or has an error after running a test connection
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
  { id: 'dest-1', project_id: 'p1', type: 'ghost' as const, name: 'My Ghost', config: {}, is_active: true, created_at: '', updated_at: '' },
  { id: 'dest-2', project_id: 'p1', type: 'postbridge' as const, name: 'My PB', config: {}, is_active: false, created_at: '', updated_at: '' }
];

const defaultData = { destinations: mockDestinations, projectId: 'p1' };

describe('Destinations Test Connection Result Display', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  it('shows green Healthy badge on successful health check', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ status: 'healthy' }), { status: 200 })
    );

    render(DestinationsPage, { props: { data: defaultData } });

    const testBtns = screen.getAllByText('Test Connection');
    await fireEvent.click(testBtns[0]);

    await waitFor(() => {
      expect(screen.getByTestId('test-result-dest-1')).toBeInTheDocument();
      expect(screen.getByTestId('test-result-dest-1').textContent).toContain('Healthy');
    });
  });

  it('shows red error badge with message on failed health check', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ status: 'error', message: 'Connection refused' }), { status: 200 })
    );

    render(DestinationsPage, { props: { data: defaultData } });

    const testBtns = screen.getAllByText('Test Connection');
    await fireEvent.click(testBtns[0]);

    await waitFor(() => {
      expect(screen.getByTestId('test-result-dest-1')).toBeInTheDocument();
      expect(screen.getByTestId('test-result-dest-1').textContent).toContain('Error: Connection refused');
    });
  });

  it('shows error badge when HTTP response is not ok', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Server error' }), { status: 500 })
    );

    render(DestinationsPage, { props: { data: defaultData } });

    const testBtns = screen.getAllByText('Test Connection');
    await fireEvent.click(testBtns[0]);

    await waitFor(() => {
      expect(screen.getByTestId('test-result-dest-1')).toBeInTheDocument();
      expect(screen.getByTestId('test-result-dest-1').textContent).toContain('Error:');
    });
  });

  it('clears previous result when re-testing', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'healthy' }), { status: 200 })
    );

    render(DestinationsPage, { props: { data: defaultData } });

    const testBtns = screen.getAllByText('Test Connection');
    await fireEvent.click(testBtns[0]);

    await waitFor(() => {
      expect(screen.getByTestId('test-result-dest-1').textContent).toContain('Healthy');
    });

    // Now re-test with a failure
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'error', message: 'Timeout' }), { status: 200 })
    );

    // Button text changes to "Testing..." during test, then back to "Test Connection"
    await waitFor(() => {
      const retestBtn = screen.getAllByText('Test Connection');
      expect(retestBtn.length).toBeGreaterThan(0);
    });

    const retestBtns = screen.getAllByText('Test Connection');
    await fireEvent.click(retestBtns[0]);

    await waitFor(() => {
      expect(screen.getByTestId('test-result-dest-1').textContent).toContain('Error: Timeout');
    });
  });

  it('does not show result for other destinations', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ status: 'healthy' }), { status: 200 })
    );

    render(DestinationsPage, { props: { data: defaultData } });

    const testBtns = screen.getAllByText('Test Connection');
    await fireEvent.click(testBtns[0]);

    await waitFor(() => {
      expect(screen.getByTestId('test-result-dest-1')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('test-result-dest-2')).not.toBeInTheDocument();
  });
});
