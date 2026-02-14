import { createSupabaseClient } from '../supabase.js';
import type { Database } from '../types/database.js';

export type EventRow = Database['public']['Tables']['events']['Row'];

const MAX_EVENTS = 100;

function createEventsStoreInternal() {
  let events: EventRow[] = [];
  let channel: ReturnType<ReturnType<typeof createSupabaseClient>['channel']> | null = null;
  const client = createSupabaseClient();
  const listeners: Array<() => void> = [];

  function notifyListeners() {
    listeners.forEach(fn => fn());
  }

  async function fetchEvents() {
    const { data, error } = await client
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data && !error) {
      events = data;
      notifyListeners();
    }
  }

  function subscribeRealtime() {
    channel = client.channel('events-realtime');
    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events' },
        (payload) => {
          events = [payload.new as EventRow, ...events].slice(0, MAX_EVENTS);
          notifyListeners();
        }
      )
      .subscribe();
  }

  function unsubscribe() {
    channel?.unsubscribe();
  }

  return {
    get events() { return events; },
    fetchEvents,
    subscribe: subscribeRealtime,
    unsubscribe,
    onChange(fn: () => void) {
      listeners.push(fn);
      return () => {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      };
    },
    destroy() {
      unsubscribe();
      listeners.length = 0;
    }
  };
}

let storeInstance: ReturnType<typeof createEventsStoreInternal> | null = null;

export function createEventsStore() {
  if (storeInstance) return storeInstance;
  storeInstance = createEventsStoreInternal();
  return storeInstance;
}

/** Reset singleton — only for tests */
export function resetEventsStore() {
  storeInstance = null;
}
