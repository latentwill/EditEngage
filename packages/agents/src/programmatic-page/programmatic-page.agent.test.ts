/**
 * @behavior Page Generator agent creates pages from template + data rows with variable
 * substitution, LLM enrichment for unique content, slug collision handling, Ghost
 * publishing, batch processing with progress, and bulk status updates
 * @business_rule Programmatic SEO pages must have unique content per page to avoid
 * duplicate content penalties; slug collisions must be resolved automatically; batch
 * generation must report progress for large data sets
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ProgrammaticPageAgent,
  ProgrammaticPageError
} from './programmatic-page.agent.js';
import { AgentType } from '../types.js';

const mockTemplate = {
  name: 'City Landing Pages',
  slug_pattern: '/best-{service}-in-{city}',
  body_template: '<h1>Best {service} in {city}</h1><p>{description}</p><section>{enrichment}</section>',
  variables: ['service', 'city', 'description']
};

const mockDataRows = [
  { service: 'plumbing', city: 'new-york', description: 'NYC plumbing services' },
  { service: 'roofing', city: 'los-angeles', description: 'LA roofing services' },
  { service: 'plumbing', city: 'chicago', description: 'Chicago plumbing services' }
];

function createMockLlm() {
  let callCount = 0;
  return vi.fn().mockImplementation(async (prompt: string) => {
    callCount++;
    return `Unique enrichment content #${callCount} generated for: ${prompt.slice(0, 50)}`;
  });
}

function createMockGhostPublisher() {
  const publishedSlugs = new Set<string>();
  return {
    publish: vi.fn().mockImplementation(async (page: { slug: string; title: string; html: string; status: string }) => {
      publishedSlugs.add(page.slug);
      return {
        ghostPostId: `ghost-${page.slug}`,
        slug: page.slug,
        url: `https://blog.example.com/${page.slug}/`
      };
    }),
    updateStatus: vi.fn().mockImplementation(async (ghostPostId: string, status: string) => {
      return { ghostPostId, status };
    }),
    getSlugs: vi.fn().mockImplementation(async () => {
      return Array.from(publishedSlugs);
    })
  };
}

describe('ProgrammaticPageAgent', () => {
  let agent: ProgrammaticPageAgent;
  let mockLlm: ReturnType<typeof createMockLlm>;
  let mockPublisher: ReturnType<typeof createMockGhostPublisher>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLlm = createMockLlm();
    mockPublisher = createMockGhostPublisher();
    agent = new ProgrammaticPageAgent(mockLlm, mockPublisher);
  });

  it('creates one page per data row with variable substitution', async () => {
    const result = await agent.execute({
      template: mockTemplate,
      dataRows: mockDataRows,
      enrichmentEnabled: false
    });

    expect(result.pages).toHaveLength(3);

    // First page should have variables substituted
    expect(result.pages[0].slug).toBe('/best-plumbing-in-new-york');
    expect(result.pages[0].html).toContain('Best plumbing in new-york');
    expect(result.pages[0].html).toContain('NYC plumbing services');

    // Second page
    expect(result.pages[1].slug).toBe('/best-roofing-in-los-angeles');
    expect(result.pages[1].html).toContain('Best roofing in los-angeles');

    // Third page
    expect(result.pages[2].slug).toBe('/best-plumbing-in-chicago');
    expect(result.pages[2].html).toContain('Chicago plumbing services');
  });

  it('calls LLM for enrichment sections producing unique content per page', async () => {
    const result = await agent.execute({
      template: mockTemplate,
      dataRows: mockDataRows,
      enrichmentEnabled: true
    });

    // LLM should be called once per data row
    expect(mockLlm).toHaveBeenCalledTimes(3);

    // Each page should have unique enrichment content
    const enrichments = result.pages.map(p => p.enrichmentContent);
    const uniqueEnrichments = new Set(enrichments);
    expect(uniqueEnrichments.size).toBe(3);

    // Enrichment content should be included in the HTML
    expect(result.pages[0].html).toContain('Unique enrichment content #1');
    expect(result.pages[1].html).toContain('Unique enrichment content #2');
    expect(result.pages[2].html).toContain('Unique enrichment content #3');
  });

  it('appends slug suffix (-2, -3) on slug collision', async () => {
    // Two rows that produce the same slug
    const duplicateRows = [
      { service: 'plumbing', city: 'new-york', description: 'First' },
      { service: 'plumbing', city: 'new-york', description: 'Second' },
      { service: 'plumbing', city: 'new-york', description: 'Third' }
    ];

    const result = await agent.execute({
      template: mockTemplate,
      dataRows: duplicateRows,
      enrichmentEnabled: false
    });

    expect(result.pages).toHaveLength(3);
    expect(result.pages[0].slug).toBe('/best-plumbing-in-new-york');
    expect(result.pages[1].slug).toBe('/best-plumbing-in-new-york-2');
    expect(result.pages[2].slug).toBe('/best-plumbing-in-new-york-3');
  });

  it('publishes pages to Ghost via Ghost publisher', async () => {
    const result = await agent.execute({
      template: mockTemplate,
      dataRows: mockDataRows,
      enrichmentEnabled: false,
      publish: true
    });

    expect(mockPublisher.publish).toHaveBeenCalledTimes(3);

    // Verify each page was published with correct data
    expect(mockPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: '/best-plumbing-in-new-york',
        title: 'Best plumbing in new-york',
        status: 'published'
      })
    );

    // Result should include Ghost post IDs
    expect(result.pages[0].ghostPostId).toBe('ghost-/best-plumbing-in-new-york');
    expect(result.pages[0].url).toBe('https://blog.example.com//best-plumbing-in-new-york/');
  });

  it('processes in chunks of 50 with progress reporting', async () => {
    // Create 120 data rows
    const manyRows = Array.from({ length: 120 }, (_, i) => ({
      service: `service-${i}`,
      city: `city-${i}`,
      description: `Description for item ${i}`
    }));

    const progressCallback = vi.fn();

    const result = await agent.execute({
      template: mockTemplate,
      dataRows: manyRows,
      enrichmentEnabled: false,
      onProgress: progressCallback
    });

    expect(result.pages).toHaveLength(120);

    // Should report progress after each chunk
    // 120 rows / 50 per chunk = 3 chunks (50, 50, 20)
    expect(progressCallback).toHaveBeenCalledTimes(3);
    expect(progressCallback).toHaveBeenCalledWith({
      processed: 50,
      total: 120,
      currentChunk: 1
    });
    expect(progressCallback).toHaveBeenCalledWith({
      processed: 100,
      total: 120,
      currentChunk: 2
    });
    expect(progressCallback).toHaveBeenCalledWith({
      processed: 120,
      total: 120,
      currentChunk: 3
    });
  });

  it('bulk publish/unpublish updates Ghost page status', async () => {
    const pageIds = ['ghost-page-1', 'ghost-page-2', 'ghost-page-3'];

    await agent.bulkUpdateStatus(pageIds, 'draft');

    expect(mockPublisher.updateStatus).toHaveBeenCalledTimes(3);
    expect(mockPublisher.updateStatus).toHaveBeenCalledWith('ghost-page-1', 'draft');
    expect(mockPublisher.updateStatus).toHaveBeenCalledWith('ghost-page-2', 'draft');
    expect(mockPublisher.updateStatus).toHaveBeenCalledWith('ghost-page-3', 'draft');

    vi.clearAllMocks();

    await agent.bulkUpdateStatus(pageIds, 'published');

    expect(mockPublisher.updateStatus).toHaveBeenCalledTimes(3);
    expect(mockPublisher.updateStatus).toHaveBeenCalledWith('ghost-page-1', 'published');
    expect(mockPublisher.updateStatus).toHaveBeenCalledWith('ghost-page-2', 'published');
    expect(mockPublisher.updateStatus).toHaveBeenCalledWith('ghost-page-3', 'published');
  });
});
