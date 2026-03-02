import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ContentStatus, Json } from '../types/database.js';

type Client = SupabaseClient<Database>;

type ContentRow = Database['public']['Tables']['content']['Row'];

export interface EditorStore {
  readonly content: ContentRow | null;
  readonly loading: boolean;
  readonly position: number;
  readonly total: number;
  readonly hasNext: boolean;
  readonly hasPrev: boolean;

  loadContent(id: string): Promise<void>;
  setFilteredIds(ids: string[]): void;
  next(): Promise<void>;
  prev(): Promise<void>;
  saveContent(updates: {
    title?: string;
    body?: Json;
    meta_description?: string;
    tags?: string[];
  }): Promise<void>;
  approve(): Promise<void>;
  reject(reason: string): Promise<void>;
}

export function createEditorStore(client: Client): EditorStore {
  let content: ContentRow | null = null;
  let loading = false;
  let filteredIds: string[] = [];
  let currentIndex = -1;

  async function loadContent(id: string): Promise<void> {
    loading = true;

    const idx = filteredIds.indexOf(id);
    if (idx !== -1) {
      currentIndex = idx;
    }

    const { data, error } = await client
      .from('content')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      loading = false;
      return;
    }

    content = data as ContentRow;
    loading = false;
  }

  function setFilteredIds(ids: string[]): void {
    filteredIds = ids;
  }

  async function next(): Promise<void> {
    if (currentIndex < filteredIds.length - 1) {
      await loadContent(filteredIds[currentIndex + 1]);
    }
  }

  async function prev(): Promise<void> {
    if (currentIndex > 0) {
      await loadContent(filteredIds[currentIndex - 1]);
    }
  }

  async function saveContent(updates: {
    title?: string;
    body?: Json;
    meta_description?: string;
    tags?: string[];
  }): Promise<void> {
    if (!content) return;

    await client
      .from('content')
      .update(updates)
      .eq('id', content.id);
  }

  async function approve(): Promise<void> {
    if (!content) return;

    await client
      .from('content')
      .update({ status: 'approved' as ContentStatus })
      .eq('id', content.id);

    if (currentIndex < filteredIds.length - 1) {
      await next();
    }
  }

  async function reject(reason: string): Promise<void> {
    if (!content) return;

    await client
      .from('content')
      .update({
        status: 'rejected' as ContentStatus,
        destination_config: { rejection_reason: reason },
      })
      .eq('id', content.id);

    if (currentIndex < filteredIds.length - 1) {
      await next();
    }
  }

  return {
    get content() { return content; },
    get loading() { return loading; },
    get position() { return currentIndex + 1; },
    get total() { return filteredIds.length; },
    get hasNext() { return currentIndex < filteredIds.length - 1; },
    get hasPrev() { return currentIndex > 0; },
    loadContent,
    setFilteredIds,
    next,
    prev,
    saveContent,
    approve,
    reject,
  };
}
