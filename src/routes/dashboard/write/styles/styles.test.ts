/**
 * @behavior Writing styles page renders styled cards and form, sends project_id when creating a style
 * @business_rule Writing styles belong to a project; POST must include project_id to satisfy DB constraint
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

import WritingStylesPage from './+page.svelte';

const mockStyles = [
  { id: '1', project_id: 'p1', name: 'Conversational', tone: 'conversational', voice_guidelines: 'Be friendly', avoid_phrases: ['synergy'], example_content: 'Hey there!', created_at: '', updated_at: '' }
];

describe('Writing Styles Page at /dashboard/write/styles', () => {
  it('renders writing styles page with data-testid', () => {
    render(WritingStylesPage, { props: { data: { writingStyles: mockStyles, projectId: 'p1' } } });
    expect(screen.getByTestId('writing-styles-page')).toBeInTheDocument();
  });

  it('renders style cards with writing style data', () => {
    render(WritingStylesPage, { props: { data: { writingStyles: mockStyles, projectId: 'p1' } } });
    const cards = screen.getAllByTestId('writing-style-card');
    expect(cards).toHaveLength(1);
    expect(screen.getByText('Conversational')).toBeInTheDocument();
  });

  it('renders with empty styles array', () => {
    render(WritingStylesPage, { props: { data: { writingStyles: [], projectId: 'p1' } } });
    expect(screen.getByTestId('writing-styles-page')).toBeInTheDocument();
    expect(screen.queryAllByTestId('writing-style-card')).toHaveLength(0);
  });
});

describe('Writing Styles Server Loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns projectId alongside writingStyles when project exists', async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: mockStyles });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    const { createServerSupabaseClient } = await import('$lib/server/supabase');
    vi.mocked(createServerSupabaseClient).mockReturnValue({
      auth: { getUser: vi.fn() },
      from: mockFrom
    } as never);

    const { load } = await import('./+page.server.js');

    const result = await load({
      parent: () => Promise.resolve({ projects: [{ id: 'proj-123' }] }),
      cookies: {}
    } as never);

    expect(result).toHaveProperty('projectId', 'proj-123');
    expect(result).toHaveProperty('writingStyles');
  });

  it('returns projectId as empty string and empty writingStyles when no project', async () => {
    const { createServerSupabaseClient } = await import('$lib/server/supabase');
    vi.mocked(createServerSupabaseClient).mockReturnValue({
      auth: { getUser: vi.fn() },
      from: vi.fn()
    } as never);

    const { load } = await import('./+page.server.js');

    const result = await load({
      parent: () => Promise.resolve({ projects: [] }),
      cookies: {}
    } as never);

    expect(result).toHaveProperty('projectId', '');
    expect(result).toEqual({ projectId: '', writingStyles: [] });
  });
});

describe('Writing Styles handleSave sends project_id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes project_id in POST body when saving a new style', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          id: 'style-new',
          project_id: 'proj-1',
          name: 'Test Style',
          tone: 'conversational',
          voice_guidelines: '',
          avoid_phrases: [],
          example_content: '',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      })
    });
    vi.stubGlobal('fetch', fetchSpy);

    render(WritingStylesPage, {
      props: { data: { writingStyles: [], projectId: 'proj-1' } }
    });

    // Open the form
    const createButton = screen.getByText('Create Style');
    await fireEvent.click(createButton);

    // Fill in the name
    const nameInput = screen.getByLabelText('Style Name');
    await fireEvent.input(nameInput, { target: { value: 'Test Style' } });

    // Submit the form
    const saveButton = screen.getByText('Save Style');
    await fireEvent.click(saveButton);

    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/writing-styles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Style',
        tone: 'conversational',
        voice_guidelines: '',
        avoid_phrases: [],
        example_content: '',
        project_id: 'proj-1'
      })
    });
  });
});
