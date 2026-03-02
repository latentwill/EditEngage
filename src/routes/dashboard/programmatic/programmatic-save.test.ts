/**
 * @behavior After saving a template, user is redirected to template list;
 * failed saves show an error message; save button is disabled while saving.
 * @business_rule Users must get clear feedback after creating a programmatic
 * SEO template to confirm it was saved and avoid duplicate submissions.
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tick } from 'svelte';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

const mockGoto = vi.fn();
vi.mock('$app/navigation', () => ({
  goto: mockGoto
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

async function renderCreateTemplate() {
  const CreateTemplatePage = (await import('./[id]/+page.svelte')).default;

  render(CreateTemplatePage, {
    props: {
      data: { template: null, mode: 'create' }
    }
  });

  // Fill required fields: name, slug pattern with variable
  const nameInput = screen.getByLabelText(/template name/i);
  await fireEvent.input(nameInput, { target: { value: 'City Pages' } });

  const slugInput = screen.getByLabelText(/slug pattern/i);
  await fireEvent.input(slugInput, { target: { value: '/best-{service}-in-{city}' } });
}

describe('Template post-save redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /dashboard/programmatic after successful save', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    await renderCreateTemplate();

    const saveButton = screen.getByRole('button', { name: /save template/i });
    await fireEvent.click(saveButton);

    await vi.waitFor(() => {
      expect(mockGoto).toHaveBeenCalledWith('/dashboard/programmatic');
    });
  });

  it('shows error message when save fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await renderCreateTemplate();

    const saveButton = screen.getByRole('button', { name: /save template/i });
    await fireEvent.click(saveButton);

    await vi.waitFor(() => {
      expect(screen.getByTestId('template-save-error')).toBeInTheDocument();
    });
  });

  it('disables save button while saving is in progress', async () => {
    let resolveRequest!: (value: { ok: boolean }) => void;
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );

    await renderCreateTemplate();

    const saveButton = screen.getByRole('button', { name: /save template/i });
    await fireEvent.click(saveButton);

    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    });

    // Resolve to clean up
    resolveRequest({ ok: true, json: () => Promise.resolve({}) } as unknown as { ok: boolean });
    await tick();
  });
});
