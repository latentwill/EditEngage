/**
 * @behavior Research page displays status filter dropdown alongside provider filter
 * @business_rule Users can filter research queries by lifecycle status
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: (resolve: (val: { data: never[]; error: null }) => void) => {
        resolve({ data: [], error: null });
      },
    })),
  }),
}));

vi.mock('$lib/stores/projectStore', () => ({
  createProjectStore: () => ({
    projects: [],
    loading: false,
  }),
}));

describe('Research Page', () => {
  it('should render a status filter dropdown', async () => {
    const Page = (await import('./+page.svelte')).default;

    render(Page);

    const statusFilter = screen.getByTestId('research-status-filter');
    expect(statusFilter).toBeInTheDocument();
    expect(statusFilter.tagName).toBe('SELECT');
  });

  it('should include all lifecycle statuses in the dropdown', async () => {
    const Page = (await import('./+page.svelte')).default;

    render(Page);

    const statusFilter = screen.getByTestId('research-status-filter');
    const options = statusFilter.querySelectorAll('option');
    const values = Array.from(options).map(o => o.getAttribute('value'));

    expect(values).toContain('');
    expect(values).toContain('queued');
    expect(values).toContain('running');
    expect(values).toContain('complete');
    expect(values).toContain('consumed');
    expect(values).toContain('active');
    expect(values).toContain('idle');
    expect(values).toContain('error');
  });
});
