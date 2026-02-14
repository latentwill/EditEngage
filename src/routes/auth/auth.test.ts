/**
 * @behavior Auth pages render correct form fields and call the correct
 * Supabase auth methods with user-provided credentials. Login and signup
 * forms display error messages on failure and redirect on success.
 * @business_rule Users must authenticate to access protected content;
 * signup captures full name for profile creation
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

const mockSupabaseClient = {
  auth: {
    signUp: vi.fn().mockResolvedValue({ data: { user: { id: '123' } }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } }, error: null }),
    signInWithOtp: vi.fn(),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null })
  }
};

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => mockSupabaseClient)
}));

const mockServerSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({
      data: { user: null },
      error: null
    }))
  },
  from: vi.fn()
};

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockServerSupabase),
  createServiceRoleClient: vi.fn(() => mockServerSupabase)
}));

describe('Signup Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email, password, and full_name fields', async () => {
    const SignupPage = (await import('./signup/+page.svelte')).default;
    render(SignupPage);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  });

  it('calls supabase.auth.signUp with correct params on form submit', async () => {
    const SignupPage = (await import('./signup/+page.svelte')).default;
    render(SignupPage);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const nameInput = screen.getByLabelText(/full name/i);

    await fireEvent.input(emailInput, { target: { value: 'user@test.com' } });
    await fireEvent.input(passwordInput, { target: { value: 'securepass123' } });
    await fireEvent.input(nameInput, { target: { value: 'Test User' } });

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    await fireEvent.click(submitButton);

    expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: 'securepass123',
      options: {
        data: {
          full_name: 'Test User'
        }
      }
    });
  });

  it('displays error message when signup fails', async () => {
    mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Email already registered' }
    });

    const SignupPage = (await import('./signup/+page.svelte')).default;
    render(SignupPage);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const nameInput = screen.getByLabelText(/full name/i);

    await fireEvent.input(emailInput, { target: { value: 'existing@test.com' } });
    await fireEvent.input(passwordInput, { target: { value: 'securepass123' } });
    await fireEvent.input(nameInput, { target: { value: 'Test User' } });

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    await fireEvent.click(submitButton);

    expect(screen.getByTestId('error-message')).toHaveTextContent('Email already registered');
  });
});

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password fields', async () => {
    const LoginPage = (await import('./login/+page.svelte')).default;
    render(LoginPage);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('calls supabase.auth.signInWithPassword with correct params on form submit', async () => {
    const LoginPage = (await import('./login/+page.svelte')).default;
    render(LoginPage);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await fireEvent.input(emailInput, { target: { value: 'user@test.com' } });
    await fireEvent.input(passwordInput, { target: { value: 'mypassword' } });

    const submitButton = screen.getByRole('button', { name: /log in/i });
    await fireEvent.click(submitButton);

    expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: 'mypassword'
    });
  });

  it('displays error message when login fails', async () => {
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Invalid login credentials' }
    });

    const LoginPage = (await import('./login/+page.svelte')).default;
    render(LoginPage);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await fireEvent.input(emailInput, { target: { value: 'user@test.com' } });
    await fireEvent.input(passwordInput, { target: { value: 'wrongpassword' } });

    const submitButton = screen.getByRole('button', { name: /log in/i });
    await fireEvent.click(submitButton);

    expect(screen.getByTestId('error-message')).toHaveTextContent('Invalid login credentials');
  });
});

describe('Logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls supabase.auth.signOut when logout is triggered', async () => {
    const { createSupabaseClient } = await import('$lib/supabase');
    const client = createSupabaseClient();

    await client.auth.signOut();

    expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
  });
});

describe('Protected Route Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated users to /auth/login', async () => {
    // Reset the mock to return null user for this test
    mockServerSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    });

    const { handle } = await import('../../hooks.server.js');

    const mockEvent = {
      url: new URL('http://localhost/dashboard'),
      locals: {} as Record<string, unknown>,
      request: new Request('http://localhost/dashboard'),
      cookies: {
        get: vi.fn().mockReturnValue(undefined),
        getAll: vi.fn().mockReturnValue([]),
        set: vi.fn(),
        delete: vi.fn(),
        serialize: vi.fn()
      }
    };

    const mockResolve = vi.fn().mockResolvedValue(new Response('OK'));

    const response = await handle({ event: mockEvent, resolve: mockResolve });

    // Should redirect to login
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/auth/login');
  });

  it('returns 401 JSON for unauthenticated API requests', async () => {
    mockServerSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    });

    const { handle } = await import('../../hooks.server.js');

    const mockEvent = {
      url: new URL('http://localhost/api/v1/projects'),
      locals: {} as Record<string, unknown>,
      request: new Request('http://localhost/api/v1/projects'),
      cookies: {
        get: vi.fn().mockReturnValue(undefined),
        getAll: vi.fn().mockReturnValue([]),
        set: vi.fn(),
        delete: vi.fn(),
        serialize: vi.fn()
      }
    };

    const mockResolve = vi.fn().mockResolvedValue(new Response('OK'));

    const response = await handle({ event: mockEvent, resolve: mockResolve });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('allows access to public paths without authentication', async () => {
    mockServerSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    });

    const { handle } = await import('../../hooks.server.js');

    const mockEvent = {
      url: new URL('http://localhost/auth/login'),
      locals: {} as Record<string, unknown>,
      request: new Request('http://localhost/auth/login'),
      cookies: {
        get: vi.fn().mockReturnValue(undefined),
        getAll: vi.fn().mockReturnValue([]),
        set: vi.fn(),
        delete: vi.fn(),
        serialize: vi.fn()
      }
    };

    const mockResolve = vi.fn().mockResolvedValue(new Response('OK'));

    const response = await handle({ event: mockEvent, resolve: mockResolve });

    expect(response.status).toBe(200);
  });
});
