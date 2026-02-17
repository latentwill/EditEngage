/**
 * @behavior Settings hub page shows navigation links to Integrations and Writing Styles.
 * Writing Styles page renders style list and creation form.
 * @business_rule Project settings are organized into Integrations (API keys + destinations)
 * and Writing Styles. Users navigate between them from the settings hub.
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase env vars
vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

// Build the chainable Supabase query builder mock
function createQueryMock(resolvedValue: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolvedValue),
    then: vi.fn((resolve: (val: unknown) => void) => resolve(resolvedValue))
  };
  const proxy = new Proxy(chain, {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: (val: unknown) => void, reject: (val: unknown) => void) => {
          return Promise.resolve(resolvedValue).then(resolve, reject);
        };
      }
      return target[prop as keyof typeof target];
    }
  });
  return proxy;
}

const mockWritingStyles = [
  {
    id: 'ws-1',
    project_id: 'proj-1',
    name: 'Casual Blog',
    tone: 'conversational',
    voice_guidelines: 'Friendly and approachable',
    avoid_phrases: ['synergy', 'leverage'],
    example_content: 'Hey there, let me tell you about...',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'ws-2',
    project_id: 'proj-1',
    name: 'Technical Docs',
    tone: 'technical',
    voice_guidelines: 'Precise and detailed',
    avoid_phrases: ['simply', 'just'],
    example_content: 'This implementation uses...',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  }
];

let writingStylesFromMock = { data: mockWritingStyles, error: null };

const mockSupabaseClient = {
  from: vi.fn((table: string) => {
    if (table === 'writing_styles') {
      return createQueryMock(writingStylesFromMock);
    }
    return createQueryMock({ data: null, error: null });
  }),
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null
    })
  }
};

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => mockSupabaseClient)
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('Settings Hub Navigation', () => {
  it('displays Integrations and Writing Styles links', async () => {
    const SettingsPage = (await import('./+page.svelte')).default;
    render(SettingsPage);

    const nav = screen.getByTestId('settings-nav');

    // Should have Integrations link (replaces old Destinations + API Keys)
    const integrationsLink = nav.querySelector('a[href="/dashboard/settings/integrations"]');
    expect(integrationsLink).toBeInTheDocument();
    expect(integrationsLink?.textContent).toContain('Integrations');

    // Should still have Writing Styles
    const stylesLink = nav.querySelector('a[href="/dashboard/settings/writing-styles"]');
    expect(stylesLink).toBeInTheDocument();

    // Should have Destinations link (added per design spec)
    const destLink = nav.querySelector('a[href="/dashboard/settings/destinations"]');
    expect(destLink).toBeInTheDocument();

    // Should NOT have old API Keys link
    const apiKeysLink = nav.querySelector('a[href="/dashboard/settings/api-keys"]');
    expect(apiKeysLink).not.toBeInTheDocument();
  });
});

describe('Writing Styles Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writingStylesFromMock = { data: mockWritingStyles, error: null };
  });

  it('lists styles with name and tone', async () => {
    const WritingStylesPage = (await import('./writing-styles/+page.svelte')).default;
    render(WritingStylesPage, { props: { data: { writingStyles: mockWritingStyles } } });

    expect(screen.getByText('Casual Blog')).toBeInTheDocument();
    expect(screen.getByText('Technical Docs')).toBeInTheDocument();
    expect(screen.getByText('conversational')).toBeInTheDocument();
    expect(screen.getByText('technical')).toBeInTheDocument();
  });

  it('create writing style form saves name, tone, guidelines, avoid phrases, example', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'new-ws' } })
    });

    const WritingStylesPage = (await import('./writing-styles/+page.svelte')).default;
    render(WritingStylesPage, { props: { data: { writingStyles: [] } } });

    const createButton = screen.getByRole('button', { name: /create style/i });
    await fireEvent.click(createButton);

    const nameInput = screen.getByLabelText(/style name/i);
    await fireEvent.input(nameInput, { target: { value: 'My New Style' } });

    const toneSelect = screen.getByLabelText(/tone/i);
    await fireEvent.change(toneSelect, { target: { value: 'playful' } });

    const guidelinesInput = screen.getByLabelText(/voice guidelines/i);
    await fireEvent.input(guidelinesInput, { target: { value: 'Be fun and engaging' } });

    const avoidInput = screen.getByLabelText(/avoid phrases/i);
    await fireEvent.input(avoidInput, { target: { value: 'synergy, leverage, pivot' } });

    const exampleInput = screen.getByLabelText(/example content/i);
    await fireEvent.input(exampleInput, { target: { value: 'Check this out!' } });

    const saveButton = screen.getByRole('button', { name: /save style/i });
    await fireEvent.click(saveButton);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/writing-styles',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'My New Style',
          tone: 'playful',
          voice_guidelines: 'Be fun and engaging',
          avoid_phrases: ['synergy', 'leverage', 'pivot'],
          example_content: 'Check this out!'
        })
      })
    );
  });
});
