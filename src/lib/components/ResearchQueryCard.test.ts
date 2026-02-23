/**
 * @behavior ResearchQueryCard displays research query info with status, providers, and actions
 * @business_rule Users manage research queries to automate content research across providers
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

describe('ResearchQueryCard', () => {
  const defaultQuery = {
    id: 'q1',
    name: 'SEO Keywords Research',
    status: 'active' as const,
    provider_chain: [
      { provider: 'perplexity', role: 'discovery' },
      { provider: 'tavily', role: 'analysis' }
    ],
    schedule: 'Every Monday 8am',
    last_run_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    brief_count: 3,
    pipeline_name: 'SEO Blog Pipeline'
  };

  it('should display query name and status badge', async () => {
    const ResearchQueryCard = (await import('./ResearchQueryCard.svelte')).default;

    render(ResearchQueryCard, {
      props: {
        query: defaultQuery,
        onviewbriefs: vi.fn(),
        onrunnow: vi.fn()
      }
    });

    expect(screen.getByTestId('research-query-card')).toBeInTheDocument();
    expect(screen.getByTestId('query-name')).toHaveTextContent('SEO Keywords Research');
    expect(screen.getByTestId('query-status')).toHaveTextContent('active');
  });

  it('should show provider badges', async () => {
    const ResearchQueryCard = (await import('./ResearchQueryCard.svelte')).default;

    render(ResearchQueryCard, {
      props: {
        query: defaultQuery,
        onviewbriefs: vi.fn(),
        onrunnow: vi.fn()
      }
    });

    const providers = screen.getByTestId('query-providers');
    expect(providers).toBeInTheDocument();
    expect(providers.textContent).toContain('perplexity');
    expect(providers.textContent).toContain('tavily');
  });

  it('should show schedule description when provided', async () => {
    const ResearchQueryCard = (await import('./ResearchQueryCard.svelte')).default;

    render(ResearchQueryCard, {
      props: {
        query: defaultQuery,
        onviewbriefs: vi.fn(),
        onrunnow: vi.fn()
      }
    });

    expect(screen.getByTestId('query-schedule')).toHaveTextContent('Every Monday 8am');
  });

  it('should show Manual only when schedule is null', async () => {
    const ResearchQueryCard = (await import('./ResearchQueryCard.svelte')).default;

    render(ResearchQueryCard, {
      props: {
        query: { ...defaultQuery, schedule: null },
        onviewbriefs: vi.fn(),
        onrunnow: vi.fn()
      }
    });

    expect(screen.getByTestId('query-schedule')).toHaveTextContent('Manual only');
  });

  it('should show last run time and brief count', async () => {
    const ResearchQueryCard = (await import('./ResearchQueryCard.svelte')).default;

    render(ResearchQueryCard, {
      props: {
        query: defaultQuery,
        onviewbriefs: vi.fn(),
        onrunnow: vi.fn()
      }
    });

    expect(screen.getByTestId('query-last-run')).toBeInTheDocument();
    expect(screen.getByTestId('query-last-run').textContent).toContain('ago');
    expect(screen.getByTestId('query-brief-count')).toHaveTextContent('3 briefs');
  });

  it('should show pipeline connection when pipeline_name is set', async () => {
    const ResearchQueryCard = (await import('./ResearchQueryCard.svelte')).default;

    render(ResearchQueryCard, {
      props: {
        query: defaultQuery,
        onviewbriefs: vi.fn(),
        onrunnow: vi.fn()
      }
    });

    expect(screen.getByTestId('query-pipeline')).toHaveTextContent('Feeds into: SEO Blog Pipeline');
  });

  it('should show Standalone when pipeline_name is null', async () => {
    const ResearchQueryCard = (await import('./ResearchQueryCard.svelte')).default;

    render(ResearchQueryCard, {
      props: {
        query: { ...defaultQuery, pipeline_name: null },
        onviewbriefs: vi.fn(),
        onrunnow: vi.fn()
      }
    });

    expect(screen.getByTestId('query-pipeline')).toHaveTextContent('Standalone');
  });

  it('should call onviewbriefs when View Briefs button is clicked', async () => {
    const onviewbriefsFn = vi.fn();
    const ResearchQueryCard = (await import('./ResearchQueryCard.svelte')).default;

    render(ResearchQueryCard, {
      props: {
        query: defaultQuery,
        onviewbriefs: onviewbriefsFn,
        onrunnow: vi.fn()
      }
    });

    const btn = screen.getByTestId('query-view-briefs-btn');
    await fireEvent.click(btn);

    expect(onviewbriefsFn).toHaveBeenCalledOnce();
  });

  it('should call onrunnow when Run Now button is clicked', async () => {
    const onrunnowFn = vi.fn();
    const ResearchQueryCard = (await import('./ResearchQueryCard.svelte')).default;

    render(ResearchQueryCard, {
      props: {
        query: defaultQuery,
        onviewbriefs: vi.fn(),
        onrunnow: onrunnowFn
      }
    });

    const btn = screen.getByTestId('query-run-now-btn');
    await fireEvent.click(btn);

    expect(onrunnowFn).toHaveBeenCalledOnce();
  });
});
