/**
 * @behavior After publishing pages to Ghost, ProgrammaticPageAgent persists
 * each generated page to the generated_pages table via Supabase, recording
 * template_id, slug, status, published_url, and enriched content.
 * @business_rule Generated programmatic SEO pages must be tracked in the
 * database so the dashboard can display them, and so we can detect/prevent
 * duplicate slugs across runs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ProgrammaticPageAgent,
  type ProgrammaticPageInput,
  type TemplateConfig
} from './programmatic-page.agent.js';
import type { AgentSupabaseClient, SupabaseQueryBuilder } from '../types.js';

const mockTemplate: TemplateConfig & { id: string } = {
  id: 'template-uuid-1',
  name: 'City Landing Pages',
  slug_pattern: '/best-{service}-in-{city}',
  body_template: '<h1>Best {service} in {city}</h1><p>{description}</p>',
  variables: ['service', 'city', 'description']
};

const mockDataRows = [
  { service: 'plumbing', city: 'new-york', description: 'NYC plumbing services' }
];

function createMockLlm() {
  return vi.fn().mockResolvedValue('enrichment content');
}

function createMockGhostPublisher() {
  return {
    publish: vi.fn().mockImplementation(async (page: { slug: string }) => ({
      ghostPostId: `ghost-${page.slug}`,
      slug: page.slug,
      url: `https://blog.example.com${page.slug}/`
    })),
    updateStatus: vi.fn().mockResolvedValue({ ghostPostId: '', status: '' }),
    getSlugs: vi.fn().mockResolvedValue([])
  };
}

function createMockSupabase() {
  const insertedRows: Record<string, unknown>[] = [];
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockImplementation((data: Record<string, unknown> | Record<string, unknown>[]) => {
    const rows = Array.isArray(data) ? data : [data];
    insertedRows.push(...rows);
    return chain;
  });
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.neq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve({ data: null, error: null }));

  const client: AgentSupabaseClient = {
    from: vi.fn().mockReturnValue(chain as unknown as SupabaseQueryBuilder),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    }
  };

  return { client, chain, insertedRows };
}

describe('ProgrammaticPageAgent generated_pages persistence', () => {
  let mockLlm: ReturnType<typeof createMockLlm>;
  let mockPublisher: ReturnType<typeof createMockGhostPublisher>;
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let agent: ProgrammaticPageAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLlm = createMockLlm();
    mockPublisher = createMockGhostPublisher();
    mockSupabase = createMockSupabase();
    agent = new ProgrammaticPageAgent(mockLlm, mockPublisher, mockSupabase.client);
  });

  it('inserts a row into generated_pages after publishing to Ghost', async () => {
    const input: ProgrammaticPageInput = {
      template: mockTemplate,
      dataRows: mockDataRows,
      enrichmentEnabled: false,
      publish: true
    };

    await agent.execute(input);

    expect(mockSupabase.client.from).toHaveBeenCalledWith('generated_pages');
    expect(mockSupabase.chain.insert).toHaveBeenCalledTimes(1);

    const inserted = mockSupabase.insertedRows[0];
    expect(inserted).toEqual(expect.objectContaining({
      template_id: 'template-uuid-1',
      slug: '/best-plumbing-in-new-york',
      status: 'published',
      published_url: 'https://blog.example.com/best-plumbing-in-new-york/',
      variables: { service: 'plumbing', city: 'new-york', description: 'NYC plumbing services' }
    }));
  });

  it('sets status to draft when publish is false', async () => {
    const input: ProgrammaticPageInput = {
      template: mockTemplate,
      dataRows: mockDataRows,
      enrichmentEnabled: false,
      publish: false
    };

    await agent.execute(input);

    expect(mockSupabase.client.from).toHaveBeenCalledWith('generated_pages');
    expect(mockSupabase.chain.insert).toHaveBeenCalledTimes(1);

    const inserted = mockSupabase.insertedRows[0];
    expect(inserted).toEqual(expect.objectContaining({
      slug: '/best-plumbing-in-new-york',
      status: 'draft',
      published_url: null
    }));
  });

  it('persists enriched content when enrichment is enabled', async () => {
    const templateWithEnrichment: TemplateConfig & { id: string } = {
      ...mockTemplate,
      body_template: '<h1>Best {service} in {city}</h1><section>{enrichment}</section>'
    };

    const input: ProgrammaticPageInput = {
      template: templateWithEnrichment,
      dataRows: mockDataRows,
      enrichmentEnabled: true,
      publish: true
    };

    await agent.execute(input);

    const inserted = mockSupabase.insertedRows[0];
    expect(inserted).toEqual(expect.objectContaining({
      enriched_content: 'enrichment content'
    }));
  });

  it('does not persist when no supabase client is provided (backward compat)', async () => {
    const agentWithoutSupabase = new ProgrammaticPageAgent(mockLlm, mockPublisher);

    const input: ProgrammaticPageInput = {
      template: mockTemplate,
      dataRows: mockDataRows,
      enrichmentEnabled: false,
      publish: true
    };

    // Should not throw
    const result = await agentWithoutSupabase.execute(input);
    expect(result.pages).toHaveLength(1);
  });
});
