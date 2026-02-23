/**
 * @behavior Research detail page shows query configuration and expandable briefs
 * @business_rule Users review research results to inform content strategy
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

const mockQuery = {
  id: 'q1',
  project_id: 'proj-1',
  name: 'SEO Keywords',
  status: 'active',
  prompt_template: 'Research {topic} trends',
  provider_chain: [
    { provider: 'perplexity', role: 'discovery' },
    { provider: 'tavily', role: 'verification' }
  ],
  synthesis_mode: 'unified',
  auto_generate_topics: true,
  schedule: 'Every Monday 8am',
  pipeline_id: 'p1',
  last_run_at: '2026-02-22T00:00:00Z',
  brief_count: 2,
  created_at: '2026-02-20T00:00:00Z',
  updated_at: '2026-02-22T00:00:00Z'
};

const mockBriefs = [
  {
    id: 'b1',
    query_id: 'q1',
    summary: 'Key findings about SEO trends',
    findings: [
      {
        provider: 'perplexity',
        content: 'SEO is evolving rapidly with AI integration...',
        sources: [
          { url: 'https://example.com/seo-guide', title: 'SEO Guide' },
          { url: 'https://example.com/ai-seo', title: 'AI in SEO' }
        ]
      }
    ],
    created_at: '2026-02-22T00:00:00Z'
  },
  {
    id: 'b2',
    query_id: 'q1',
    summary: 'Earlier research on keyword strategies',
    findings: [
      {
        provider: 'tavily',
        content: 'Keyword clustering is becoming more important...',
        sources: [
          { url: 'https://example.com/keywords', title: 'Keyword Strategies' }
        ]
      }
    ],
    created_at: '2026-02-21T00:00:00Z'
  }
];

describe('Research Detail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show query configuration — name, prompt, providers, schedule, synthesis', async () => {
    const DetailPage = (await import('./+page.svelte')).default;

    render(DetailPage, {
      props: {
        data: {
          query: mockQuery,
          briefs: mockBriefs,
          pipelineName: 'SEO Pipeline'
        }
      }
    });

    // Page container
    expect(screen.getByTestId('research-detail-page')).toBeInTheDocument();

    // Back button
    expect(screen.getByTestId('detail-back-btn')).toBeInTheDocument();

    // Query name
    const queryName = screen.getByTestId('detail-query-name');
    expect(queryName).toHaveTextContent('SEO Keywords');

    // Status badge
    const statusBadge = screen.getByTestId('detail-query-status');
    expect(statusBadge).toHaveTextContent('active');

    // Configuration section
    expect(screen.getByTestId('detail-config')).toBeInTheDocument();

    // Prompt template
    const prompt = screen.getByTestId('detail-prompt');
    expect(prompt).toHaveTextContent('Research {topic} trends');

    // Provider badges
    const providers = screen.getByTestId('detail-providers');
    expect(providers).toHaveTextContent('perplexity');
    expect(providers).toHaveTextContent('tavily');

    // Schedule
    const schedule = screen.getByTestId('detail-schedule');
    expect(schedule).toHaveTextContent('Every Monday 8am');

    // Synthesis mode
    const synthesis = screen.getByTestId('detail-synthesis');
    expect(synthesis).toHaveTextContent('unified');
  });

  it('should list briefs in reverse chronological order — newest first', async () => {
    const DetailPage = (await import('./+page.svelte')).default;

    render(DetailPage, {
      props: {
        data: {
          query: mockQuery,
          briefs: mockBriefs,
          pipelineName: 'SEO Pipeline'
        }
      }
    });

    // Briefs section exists
    expect(screen.getByTestId('detail-briefs-section')).toBeInTheDocument();

    // Brief count heading
    const briefCount = screen.getByTestId('detail-brief-count');
    expect(briefCount).toHaveTextContent('2');

    // Brief cards rendered
    const briefCards = screen.getAllByTestId('brief-card');
    expect(briefCards).toHaveLength(2);

    // Brief summaries visible
    const summaries = screen.getAllByTestId('brief-summary');
    expect(summaries[0]).toHaveTextContent('Key findings about SEO trends');
    expect(summaries[1]).toHaveTextContent('Earlier research on keyword strategies');
  });

  it('should expand brief to show findings — click expand, findings visible', async () => {
    const ResearchBriefView = (await import('$lib/components/ResearchBriefView.svelte')).default;

    render(ResearchBriefView, {
      props: {
        brief: mockBriefs[0]
      }
    });

    // Summary should be visible
    expect(screen.getByTestId('brief-summary')).toHaveTextContent('Key findings about SEO trends');

    // Findings should NOT be visible initially
    expect(screen.queryByTestId('brief-findings')).not.toBeInTheDocument();

    // Click expand
    const expandBtn = screen.getByTestId('brief-expand-btn');
    await fireEvent.click(expandBtn);

    // Findings should now be visible
    const findings = screen.getByTestId('brief-findings');
    expect(findings).toBeInTheDocument();
    expect(findings).toHaveTextContent('SEO is evolving rapidly with AI integration...');
    expect(findings).toHaveTextContent('perplexity');
  });

  it('should show source citations with links — source URLs rendered as links', async () => {
    const ResearchBriefView = (await import('$lib/components/ResearchBriefView.svelte')).default;

    render(ResearchBriefView, {
      props: {
        brief: mockBriefs[0]
      }
    });

    // Expand to see findings
    await fireEvent.click(screen.getByTestId('brief-expand-btn'));

    // Source links
    const sourceLinks = screen.getAllByTestId('brief-source-link');
    expect(sourceLinks).toHaveLength(2);

    const firstLink = sourceLinks[0] as HTMLAnchorElement;
    expect(firstLink).toHaveTextContent('SEO Guide');
    expect(firstLink).toHaveAttribute('href', 'https://example.com/seo-guide');
    expect(firstLink).toHaveAttribute('target', '_blank');
    expect(firstLink).toHaveAttribute('rel', 'noopener noreferrer');

    const secondLink = sourceLinks[1] as HTMLAnchorElement;
    expect(secondLink).toHaveTextContent('AI in SEO');
    expect(secondLink).toHaveAttribute('href', 'https://example.com/ai-seo');
  });

  it('should show pipeline connection — pipeline name displayed', async () => {
    const DetailPage = (await import('./+page.svelte')).default;

    render(DetailPage, {
      props: {
        data: {
          query: mockQuery,
          briefs: mockBriefs,
          pipelineName: 'SEO Pipeline'
        }
      }
    });

    const pipeline = screen.getByTestId('detail-pipeline');
    expect(pipeline).toHaveTextContent('SEO Pipeline');
  });
});
