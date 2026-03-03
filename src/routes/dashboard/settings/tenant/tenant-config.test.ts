/**
 * @behavior Tenant configuration settings page allows org admins to customize
 *   tenant type, module visibility, vocabulary labels, destinations, and UI theme.
 * @business_rule Only authenticated users with org membership can view/edit tenant config.
 *   Changes are persisted via PATCH /api/v1/organizations/:id.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

// --- Chainable Supabase mock ---

interface MockChain {
  client: { auth: { getUser: ReturnType<typeof vi.fn> }; from: ReturnType<typeof vi.fn> };
  getUser: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
}

function createMockSupabaseClient(options: {
  user: { id: string } | null;
  membership: { org_id: string; role: string } | null;
  org: Record<string, unknown> | null;
}): MockChain {
  const getUser = vi.fn().mockResolvedValue({
    data: { user: options.user },
    error: null
  });

  // We need two separate .from() chains: one for organization_members, one for organizations
  const membershipSingle = vi.fn().mockResolvedValue({
    data: options.membership,
    error: options.membership ? null : { message: 'not found' }
  });
  const membershipEq = vi.fn().mockReturnValue({ single: membershipSingle });
  const membershipSelect = vi.fn().mockReturnValue({
    eq: membershipEq
  });

  const orgSingle = vi.fn().mockResolvedValue({
    data: options.org,
    error: options.org ? null : { message: 'not found' }
  });
  const orgEq = vi.fn().mockReturnValue({ single: orgSingle });
  const orgSelect = vi.fn().mockReturnValue({ eq: orgEq });

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'organization_members') {
      return { select: membershipSelect };
    }
    if (table === 'organizations') {
      return { select: orgSelect };
    }
    return { select: vi.fn() };
  });

  return {
    client: {
      auth: { getUser },
      from
    },
    getUser,
    from,
    select: membershipSelect,
    eq: membershipEq,
    single: membershipSingle
  };
}

let mockSupabase: MockChain;

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => mockSupabase.client)
}));

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => ({}))
}));

describe('Tenant Config — Server Loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns org config data for authenticated user with membership', async () => {
    const orgData = {
      id: 'org-1',
      name: 'Test Org',
      vocabulary_labels: { topics: 'Themes' },
      default_writing_style_preset: 'formal',
      default_destination_types: ['ghost', 'webhook'],
      ui_theme: { primary_color: '#ff0000' },
      enabled_modules: ['research', 'writing'],
      tenant_type: 'content'
    };

    mockSupabase = createMockSupabaseClient({
      user: { id: 'user-1' },
      membership: { org_id: 'org-1', role: 'admin' },
      org: orgData
    });

    const { load } = await import('./+page.server');

    const result = await load({
      cookies: {} as never,
      locals: {} as never
    } as never);

    expect(result).toEqual({ org: orgData, role: 'admin' });
  });

  it('returns null org when user is not authenticated', async () => {
    mockSupabase = createMockSupabaseClient({
      user: null,
      membership: null,
      org: null
    });

    const { load } = await import('./+page.server');

    const result = await load({
      cookies: {} as never,
      locals: {} as never
    } as never);

    expect(result).toEqual({ org: null });
  });
});

const sampleOrg = {
  id: 'org-1',
  name: 'Test Org',
  vocabulary_labels: {},
  default_writing_style_preset: null,
  default_destination_types: ['ghost'],
  ui_theme: {},
  enabled_modules: ['research', 'writing', 'publish'],
  tenant_type: 'content' as const
};

describe('Tenant Config — UI Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tenant type dropdown with content, research, and enterprise options', { timeout: 15000 }, async () => {
    const TenantPage = (await import('./+page.svelte')).default;

    render(TenantPage, {
      props: { data: { org: sampleOrg, role: 'admin' } }
    });

    const select = screen.getByTestId('tenant-type-select');
    expect(select).toBeInTheDocument();

    const options = select.querySelectorAll('option');
    const values = Array.from(options).map((o: Element) => (o as HTMLOptionElement).value);
    expect(values).toContain('content');
    expect(values).toContain('research');
    expect(values).toContain('enterprise');
  });

  it('renders module visibility checkboxes for research, writing, and publish', { timeout: 15000 }, async () => {
    const TenantPage = (await import('./+page.svelte')).default;

    render(TenantPage, {
      props: { data: { org: sampleOrg, role: 'admin' } }
    });

    expect(screen.getByTestId('module-research')).toBeInTheDocument();
    expect(screen.getByTestId('module-writing')).toBeInTheDocument();
    expect(screen.getByTestId('module-publish')).toBeInTheDocument();
  });

  it('save button calls PATCH API with form data', { timeout: 15000 }, async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    vi.stubGlobal('fetch', mockFetch);

    const TenantPage = (await import('./+page.svelte')).default;

    render(TenantPage, {
      props: { data: { org: sampleOrg, role: 'admin' } }
    });

    const saveBtn = screen.getByTestId('save-tenant-config');
    await fireEvent.click(saveBtn);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/organizations/org-1',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.any(String)
      })
    );

    vi.unstubAllGlobals();
  });
});
