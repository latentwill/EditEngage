/**
 * @behavior Dashboard layout renders GlassNav with project switcher, a
 * CommandTicker placeholder, redirects unauthenticated users, and provides
 * active project data to child routes
 * @business_rule The dashboard is a protected area; only authenticated users
 * with valid sessions may access it. All child routes receive the active project.
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment variables
vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

const mockProjects = [
  { id: 'proj-1', org_id: 'org-1', name: 'Alpha', description: null, icon: null, color: null, domain: null, settings: {}, created_at: '', updated_at: '' },
  { id: 'proj-2', org_id: 'org-1', name: 'Beta', description: null, icon: null, color: null, domain: null, settings: {}, created_at: '', updated_at: '' }
];

const mockSession = {
  user: { id: 'user-1', email: 'test@example.com' },
  access_token: 'token'
};

// Mock supabase client
const mockSupabase = {
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: mockSession.user }, error: null }),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOtp: vi.fn(),
    signOut: vi.fn()
  },
  from: vi.fn()
};

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => mockSupabase)
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase),
  createServiceRoleClient: vi.fn(() => mockSupabase)
}));

describe('Dashboard Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders GlassNav with project switcher', async () => {
    const DashboardLayout = (await import('./+layout.svelte')).default;

    render(DashboardLayout, {
      props: {
        data: { projects: mockProjects, session: mockSession }
      }
    });

    const nav = screen.getByTestId('glass-nav');
    expect(nav).toBeInTheDocument();

    const switcher = screen.getByTestId('project-switcher-trigger');
    expect(switcher).toBeInTheDocument();
  });

  it('renders CommandTicker placeholder at bottom', async () => {
    const DashboardLayout = (await import('./+layout.svelte')).default;

    render(DashboardLayout, {
      props: {
        data: { projects: mockProjects, session: mockSession }
      }
    });

    const tickerSlot = screen.getByTestId('command-ticker-slot');
    expect(tickerSlot).toBeInTheDocument();
  });

  it('redirects unauthenticated users to /auth/login', async () => {
    // Test via the handle function — hooks now use getUser
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null
    });

    const { handle } = await import('../../hooks.server.js');

    const mockEvent = {
      url: new URL('http://localhost/dashboard'),
      locals: {} as Record<string, unknown>,
      request: new Request('http://localhost/dashboard'),
      cookies: { get: vi.fn(), getAll: vi.fn().mockReturnValue([]), set: vi.fn(), delete: vi.fn(), serialize: vi.fn() }
    };

    const mockResolve = vi.fn().mockResolvedValue(new Response('OK'));
    const response = await handle({ event: mockEvent, resolve: mockResolve });

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/auth/login');
  });

  it('passes active project to child routes via data', async () => {
    const DashboardLayout = (await import('./+layout.svelte')).default;

    const { container } = render(DashboardLayout, {
      props: {
        data: { projects: mockProjects, session: mockSession }
      }
    });

    // The layout should render the main content area where children go
    const mainContent = screen.getByTestId('dashboard-main');
    expect(mainContent).toBeInTheDocument();

    // Verify projects data is available (rendered in the project switcher)
    const switcher = screen.getByTestId('project-switcher-trigger');
    expect(switcher.textContent).toContain('Alpha');
  });
});
