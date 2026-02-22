/**
 * @behavior Dashboard metric queries fetch and aggregate content/pipeline data from Supabase
 * @business_rule Hero metrics provide at-a-glance insight into publishing velocity,
 * content volume, review backlog, and pipeline health -- scoped by project selection
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchPublishedThisWeek,
  fetchWordsGenerated,
  fetchPendingReview,
  fetchActivePipelines,
  fetchMetricTrends,
  type DashboardMetrics
} from './dashboardMetrics.js';

// --- Supabase mock helpers ---

function createMockSupabaseClient() {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    then: undefined as unknown // mark as non-thenable
  };

  // Default: resolve with empty data
  let resolvedValue: { data: unknown; error: unknown; count?: number } = { data: [], error: null };

  // Allow tests to set what the query chain resolves to
  const setResult = (result: { data: unknown; error: unknown; count?: number }) => {
    resolvedValue = result;
    // Make the chain thenable so `await` works
    (chainable as Record<string, unknown>).then = (
      onFulfilled: (v: typeof resolvedValue) => void
    ) => Promise.resolve(resolvedValue).then(onFulfilled);
  };

  // By default, resolve immediately
  setResult({ data: [], error: null });

  const from = vi.fn().mockReturnValue(chainable);

  return { client: { from } as unknown, chainable, setResult, from };
}

describe('fetchPublishedThisWeek', () => {
  it('should return count of published content from last 7 days', async () => {
    const { client, chainable } = createMockSupabaseClient();

    // Simulate Supabase returning 5 published items
    chainable.select.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        gte: vi.fn().mockResolvedValue({ data: [], error: null, count: 5 })
      })
    });

    const count = await fetchPublishedThisWeek(client as never);
    expect(count).toBe(5);
  });

  it('should scope to single project when specific project selected', async () => {
    const { client, chainable, from } = createMockSupabaseClient();

    chainable.select.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null, count: 3 })
        })
      })
    });

    const count = await fetchPublishedThisWeek(client as never, 'project-123');
    expect(count).toBe(3);
    expect(from).toHaveBeenCalledWith('content');
  });

  it('should aggregate across all projects when no projectId passed', async () => {
    const { client, chainable, from } = createMockSupabaseClient();

    chainable.select.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        gte: vi.fn().mockResolvedValue({ data: [], error: null, count: 12 })
      })
    });

    const count = await fetchPublishedThisWeek(client as never);
    expect(count).toBe(12);
    expect(from).toHaveBeenCalledWith('content');
  });
});

describe('fetchWordsGenerated', () => {
  it('should return total word count from content body text', async () => {
    const { client, chainable } = createMockSupabaseClient();

    const contentRows = [
      { body: { text: 'Hello world this is a test' } },       // 6 words
      { body: { text: 'Another piece of content here now' } }  // 6 words
    ];

    chainable.select.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        gte: vi.fn().mockResolvedValue({ data: contentRows, error: null })
      })
    });

    const total = await fetchWordsGenerated(client as never);
    expect(total).toBe(12);
  });

  it('should handle null body gracefully', async () => {
    const { client, chainable } = createMockSupabaseClient();

    const contentRows = [
      { body: null },
      { body: { text: 'Three words here' } }
    ];

    chainable.select.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        gte: vi.fn().mockResolvedValue({ data: contentRows, error: null })
      })
    });

    const total = await fetchWordsGenerated(client as never);
    expect(total).toBe(3);
  });

  it('should scope to single project when projectId provided', async () => {
    const { client, chainable } = createMockSupabaseClient();

    const contentRows = [{ body: { text: 'Two words' } }];

    chainable.select.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: contentRows, error: null })
        })
      })
    });

    const total = await fetchWordsGenerated(client as never, 'proj-1');
    expect(total).toBe(2);
  });
});

describe('fetchPendingReview', () => {
  it('should return count of draft and in_review content', async () => {
    const { client, chainable } = createMockSupabaseClient();

    chainable.select.mockReturnValueOnce({
      or: vi.fn().mockResolvedValue({ data: [], error: null, count: 8 })
    });

    const count = await fetchPendingReview(client as never);
    expect(count).toBe(8);
  });

  it('should scope to project when projectId provided', async () => {
    const { client, chainable } = createMockSupabaseClient();

    chainable.select.mockReturnValueOnce({
      or: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null, count: 2 })
      })
    });

    const count = await fetchPendingReview(client as never, 'proj-abc');
    expect(count).toBe(2);
  });
});

describe('fetchActivePipelines', () => {
  it('should return active/total as "X of Y active"', async () => {
    const { client, chainable } = createMockSupabaseClient();

    // totalQuery: from('pipelines').select(...) -- resolves directly (no .eq after select)
    // activeQuery: from('pipelines').select(...).eq('is_active', true)
    chainable.select
      .mockResolvedValueOnce({ data: [], error: null, count: 10 })
      .mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ data: [], error: null, count: 4 })
      });

    const result = await fetchActivePipelines(client as never);
    expect(result).toEqual({ active: 4, total: 10 });
  });

  it('should scope to project when projectId provided', async () => {
    const { client, chainable, from } = createMockSupabaseClient();

    // totalQuery: select(...).eq('project_id', ...) -- one eq call
    // activeQuery: select(...).eq('is_active', true).eq('project_id', ...) -- two eq calls
    chainable.select
      .mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ data: [], error: null, count: 5 })
      })
      .mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null, count: 2 })
        })
      });

    const result = await fetchActivePipelines(client as never, 'proj-x');
    expect(result).toEqual({ active: 2, total: 5 });
    expect(from).toHaveBeenCalledWith('pipelines');
  });
});

describe('fetchMetricTrends', () => {
  it('should return trend percentages comparing this week vs last week', async () => {
    const { client, chainable } = createMockSupabaseClient();

    // thisWeek: 10 published, lastWeek: 8 published
    // trend = ((10 - 8) / 8) * 100 = 25%
    chainable.select
      .mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({ data: [], error: null, count: 10 })
        })
      })
      .mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lt: vi.fn().mockResolvedValue({ data: [], error: null, count: 8 })
          })
        })
      });

    const trend = await fetchMetricTrends(client as never);
    expect(trend.publishedTrend).toBe(25);
  });

  it('should return 0 trend when last week had 0 published', async () => {
    const { client, chainable } = createMockSupabaseClient();

    chainable.select
      .mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({ data: [], error: null, count: 5 })
        })
      })
      .mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lt: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 })
          })
        })
      });

    const trend = await fetchMetricTrends(client as never);
    expect(trend.publishedTrend).toBe(0);
  });

  it('should scope trends to project when projectId provided', async () => {
    const { client, chainable, from } = createMockSupabaseClient();

    chainable.select
      .mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null, count: 6 })
          })
        })
      })
      .mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null, count: 4 })
            })
          })
        })
      });

    const trend = await fetchMetricTrends(client as never, 'proj-1');
    expect(trend.publishedTrend).toBe(50);
    expect(from).toHaveBeenCalledWith('content');
  });
});
