import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ContentType, ContentStatus } from '../types/database.js';

type Client = SupabaseClient<Database>;

type ContentRow = Database['public']['Tables']['content']['Row'];

interface ContentWithProject extends ContentRow {
  projects: { name: string; color: string | null } | null;
}

export interface FeedFilters {
  status?: string;
  pipeline_id?: string;
  content_type?: string;
  project_id?: string;
}

export interface FeedStore {
  readonly items: ContentWithProject[];
  readonly loading: boolean;
  readonly hasMore: boolean;
  readonly filters: FeedFilters;
  loadFeed(filters?: FeedFilters, cursor?: string): Promise<void>;
  loadMore(): Promise<void>;
  approveContent(id: string): Promise<void>;
  rejectContent(id: string, reason: string): Promise<void>;
  setFilters(filters: FeedFilters): void;
}

const PAGE_SIZE = 20;

export function createFeedStore(client: Client): FeedStore {
  let items: ContentWithProject[] = [];
  let loading = false;
  let hasMore = false;
  let currentFilters: FeedFilters = {};

  async function loadFeed(filters?: FeedFilters, cursor?: string): Promise<void> {
    loading = true;

    if (filters !== undefined) {
      currentFilters = filters;
    }

    let query = client
      .from('content')
      .select('*, projects(name, color), pipeline_runs(pipeline_id)');

    // Apply filters
    if (currentFilters.status === 'pending') {
      query = query.or('status.eq.draft,status.eq.in_review');
    } else if (currentFilters.status) {
      query = query.eq('status', currentFilters.status as ContentStatus);
    }

    if (currentFilters.pipeline_id) {
      query = query.eq('pipeline_runs.pipeline_id', currentFilters.pipeline_id);
    }

    if (currentFilters.content_type) {
      query = query.eq('content_type', currentFilters.content_type as ContentType);
    }

    if (currentFilters.project_id) {
      query = query.eq('project_id', currentFilters.project_id);
    }

    // Cursor-based pagination
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    query = query.order('created_at', { ascending: false }).limit(PAGE_SIZE);

    const { data, error } = await query;

    if (error || !data) {
      loading = false;
      return;
    }

    const fetched = data as unknown as ContentWithProject[];

    if (cursor) {
      items = [...items, ...fetched];
    } else {
      items = fetched;
    }

    hasMore = fetched.length >= PAGE_SIZE;
    loading = false;
  }

  async function loadMore(): Promise<void> {
    if (items.length === 0) return;
    const lastItem = items[items.length - 1];
    await loadFeed(undefined, lastItem.created_at);
  }

  async function approveContent(id: string): Promise<void> {
    await client
      .from('content')
      .update({ status: 'approved' as ContentStatus })
      .eq('id', id);
  }

  async function rejectContent(id: string, reason: string): Promise<void> {
    await client
      .from('content')
      .update({
        status: 'rejected' as ContentStatus,
        destination_config: { rejection_reason: reason },
      })
      .eq('id', id);
  }

  function setFilters(filters: FeedFilters): void {
    currentFilters = filters;
  }

  return {
    get items() { return items; },
    get loading() { return loading; },
    get hasMore() { return hasMore; },
    get filters() { return currentFilters; },
    loadFeed,
    loadMore,
    approveContent,
    rejectContent,
    setFilters,
  };
}
