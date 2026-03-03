/**
 * @behavior ResearchBriefView displays output type badges and structured citation attribution
 * @business_rule Users need to identify brief types at a glance and trace findings back to sources
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ResearchBrief } from '$lib/types/research';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

vi.mock('$app/navigation', () => ({
  goto: vi.fn()
}));

const baseBrief = {
  id: 'b1',
  summary: 'Key findings about SEO trends',
  findings: [
    {
      provider: 'perplexity',
      content: 'SEO is evolving rapidly',
      sources: [{ url: 'https://example.com/seo', title: 'SEO Guide' }]
    }
  ],
  created_at: '2026-02-22T00:00:00Z'
};

describe('ResearchBriefView - output type badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * @behavior Displays a color-coded badge for the output type
   * @business_rule source_document briefs show a primary badge so users know the content type
   */
  it('should render output_type badge with correct class for source_document', async () => {
    const ResearchBriefView = (await import('./ResearchBriefView.svelte')).default;

    render(ResearchBriefView, {
      props: {
        brief: { ...baseBrief, output_type: 'source_document' }
      }
    });

    const badge = screen.getByTestId('brief-output-type');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('source_document');
    expect(badge.className).toContain('badge-primary');
  });

  it('should render badge-info for topic_candidate', async () => {
    const ResearchBriefView = (await import('./ResearchBriefView.svelte')).default;

    render(ResearchBriefView, {
      props: {
        brief: { ...baseBrief, output_type: 'topic_candidate' }
      }
    });

    const badge = screen.getByTestId('brief-output-type');
    expect(badge).toHaveTextContent('topic_candidate');
    expect(badge.className).toContain('badge-info');
  });

  it('should render badge-warning for competitive_signal', async () => {
    const ResearchBriefView = (await import('./ResearchBriefView.svelte')).default;

    render(ResearchBriefView, {
      props: {
        brief: { ...baseBrief, output_type: 'competitive_signal' }
      }
    });

    const badge = screen.getByTestId('brief-output-type');
    expect(badge).toHaveTextContent('competitive_signal');
    expect(badge.className).toContain('badge-warning');
  });

  it('should render badge-accent for data_point', async () => {
    const ResearchBriefView = (await import('./ResearchBriefView.svelte')).default;

    render(ResearchBriefView, {
      props: {
        brief: { ...baseBrief, output_type: 'data_point' }
      }
    });

    const badge = screen.getByTestId('brief-output-type');
    expect(badge).toHaveTextContent('data_point');
    expect(badge.className).toContain('badge-accent');
  });
});

describe('ResearchBriefView - citations section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * @behavior Displays structured citations with URL, title, date, and relevance score
   * @business_rule Users need to trace findings back to original sources with quality indicators
   */
  it('should render structured citations with URL, title, date, and relevance when expanded', async () => {
    const ResearchBriefView = (await import('./ResearchBriefView.svelte')).default;

    const briefWithCitations: ResearchBrief = {
      ...baseBrief,
      output_type: 'source_document',
      citations: [
        {
          url: 'https://example.com/source1',
          title: 'First Source',
          snippet: 'Important info',
          provider: 'perplexity',
          date: '2026-02-15',
          relevance_score: 0.92
        },
        {
          url: 'https://example.com/source2',
          title: 'Second Source',
          snippet: 'More info',
          provider: 'tavily',
          date: null,
          relevance_score: null
        }
      ]
    };

    render(ResearchBriefView, {
      props: { brief: briefWithCitations }
    });

    // Click citations expand button
    const citationsBtn = screen.getByTestId('brief-citations-btn');
    await fireEvent.click(citationsBtn);

    // Citations section visible
    const citationsSection = screen.getByTestId('brief-citations');
    expect(citationsSection).toBeInTheDocument();

    // First citation with full metadata
    const citationLinks = screen.getAllByTestId('citation-link');
    expect(citationLinks).toHaveLength(2);

    const firstLink = citationLinks[0] as HTMLAnchorElement;
    expect(firstLink).toHaveTextContent('First Source');
    expect(firstLink).toHaveAttribute('href', 'https://example.com/source1');

    // Date displayed
    const dates = screen.getAllByTestId('citation-date');
    expect(dates[0]).toHaveTextContent('Feb 15, 2026');

    // Relevance score displayed
    const scores = screen.getAllByTestId('citation-relevance');
    expect(scores[0]).toHaveTextContent('92%');
  });

  it('should not render citations section when citations array is empty', async () => {
    const ResearchBriefView = (await import('./ResearchBriefView.svelte')).default;

    render(ResearchBriefView, {
      props: {
        brief: { ...baseBrief, output_type: 'source_document', citations: [] }
      }
    });

    expect(screen.queryByTestId('brief-citations-btn')).not.toBeInTheDocument();
  });

  it('should not render citations section when citations is undefined', async () => {
    const ResearchBriefView = (await import('./ResearchBriefView.svelte')).default;

    render(ResearchBriefView, {
      props: {
        brief: { ...baseBrief, output_type: 'source_document' }
      }
    });

    expect(screen.queryByTestId('brief-citations-btn')).not.toBeInTheDocument();
  });
});
