/**
 * @behavior Research detail page shows lifecycle step indicator and consumed-by info
 * @business_rule Users see where a query is in the Queued -> Running -> Complete -> Consumed lifecycle
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

const baseQuery = {
  id: 'q-1',
  project_id: 'proj-1',
  name: 'SEO Research',
  prompt_template: 'Research {{topic}}',
  provider_chain: [{ provider: 'perplexity', role: 'discovery' }],
  synthesis_mode: 'unified',
  auto_generate_topics: false,
  schedule: 'Daily',
  pipeline_id: null,
  status: 'running',
  last_run_at: null,
  brief_count: 0,
  created_at: '2026-02-22T01:00:00Z',
  updated_at: '2026-02-22T01:00:00Z',
};

describe('Research Detail Page', () => {
  it('should display lifecycle step indicator', async () => {
    const Page = (await import('./+page.svelte')).default;

    render(Page, {
      props: {
        data: {
          query: { ...baseQuery, status: 'running' },
          briefs: [],
          pipelineName: null,
        },
      },
    });

    const lifecycle = screen.getByTestId('detail-lifecycle');
    expect(lifecycle).toBeInTheDocument();
    expect(lifecycle.textContent).toContain('Queued');
    expect(lifecycle.textContent).toContain('Running');
    expect(lifecycle.textContent).toContain('Complete');
    expect(lifecycle.textContent).toContain('Consumed');
  });

  it('should show consumed-by workflow name when status is consumed', async () => {
    const Page = (await import('./+page.svelte')).default;

    render(Page, {
      props: {
        data: {
          query: { ...baseQuery, status: 'consumed' },
          briefs: [],
          pipelineName: 'SEO Blog Pipeline',
        },
      },
    });

    const consumedBy = screen.getByTestId('detail-consumed-by');
    expect(consumedBy).toBeInTheDocument();
    expect(consumedBy.textContent).toContain('SEO Blog Pipeline');
  });

  it('should not show consumed-by when status is not consumed', async () => {
    const Page = (await import('./+page.svelte')).default;

    render(Page, {
      props: {
        data: {
          query: { ...baseQuery, status: 'running' },
          briefs: [],
          pipelineName: 'SEO Blog Pipeline',
        },
      },
    });

    expect(screen.queryByTestId('detail-consumed-by')).not.toBeInTheDocument();
  });
});
