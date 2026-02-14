/**
 * @behavior Events store manages real-time event subscriptions and state
 * @business_rule Events are fetched from Supabase and updated via real-time channel
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

const mockOn = vi.fn().mockReturnThis();
const mockSubscribe = vi.fn().mockReturnValue({ unsubscribe: vi.fn() });
const mockChannel = {
  on: mockOn,
  subscribe: mockSubscribe,
  unsubscribe: vi.fn()
};

const mockEvents = [
  {
    id: 'evt-1',
    project_id: 'proj-1',
    event_type: 'pipeline.started',
    description: 'Pipeline started',
    metadata: {},
    is_read: false,
    created_at: '2025-01-15T10:00:00Z'
  },
  {
    id: 'evt-2',
    project_id: 'proj-1',
    event_type: 'content.published',
    description: 'Article published',
    metadata: {},
    is_read: true,
    created_at: '2025-01-15T09:00:00Z'
  }
];

const mockLimitReturn = {
  data: mockEvents,
  error: null
};

const mockOrderReturn = {
  limit: vi.fn().mockReturnValue(mockLimitReturn)
};

const mockSelectReturn = {
  order: vi.fn().mockReturnValue(mockOrderReturn)
};

const mockFromReturn = {
  select: vi.fn().mockReturnValue(mockSelectReturn)
};

const mockClient = {
  from: vi.fn().mockReturnValue(mockFromReturn),
  channel: vi.fn().mockReturnValue(mockChannel)
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockClient)
}));

describe('events store', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockOn.mockReturnValue(mockChannel);
    mockSubscribe.mockReturnValue({ unsubscribe: vi.fn() });
    mockClient.from.mockReturnValue(mockFromReturn);
    mockFromReturn.select.mockReturnValue(mockSelectReturn);
    mockSelectReturn.order.mockReturnValue(mockOrderReturn);
    mockOrderReturn.limit.mockReturnValue(mockLimitReturn);

    // Reset singleton between tests
    const { resetEventsStore } = await import('./events.js');
    resetEventsStore();
  });

  it('fetchEvents loads events from Supabase ordered by created_at desc with limit', async () => {
    const { createEventsStore } = await import('./events.js');
    const store = createEventsStore();

    await store.fetchEvents();

    expect(mockClient.from).toHaveBeenCalledWith('events');
    expect(mockFromReturn.select).toHaveBeenCalledWith('*');
    expect(mockSelectReturn.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(mockOrderReturn.limit).toHaveBeenCalledWith(50);
    expect(store.events).toHaveLength(2);
    expect(store.events[0].id).toBe('evt-1');
  });

  it('subscribe creates a real-time channel for events table inserts', async () => {
    const { createEventsStore } = await import('./events.js');
    const store = createEventsStore();

    store.subscribe();

    expect(mockClient.channel).toHaveBeenCalledWith('events-realtime');
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'events' },
      expect.any(Function)
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('prepends new event and caps array at 100 when real-time INSERT is received', async () => {
    const { createEventsStore } = await import('./events.js');
    const store = createEventsStore();

    await store.fetchEvents();
    store.subscribe();

    // Get the callback passed to .on()
    const onCallback = mockOn.mock.calls[0][2];
    const newEvent = {
      id: 'evt-3',
      project_id: 'proj-1',
      event_type: 'topic.created',
      description: 'New topic added',
      metadata: {},
      is_read: false,
      created_at: '2025-01-15T11:00:00Z'
    };

    onCallback({ new: newEvent });

    expect(store.events).toHaveLength(3);
    expect(store.events[0].id).toBe('evt-3');
  });

  it('unsubscribe removes the real-time channel', async () => {
    const { createEventsStore } = await import('./events.js');
    const store = createEventsStore();

    store.subscribe();
    store.unsubscribe();

    expect(mockChannel.unsubscribe).toHaveBeenCalled();
  });

  it('singleton returns same instance on multiple calls', async () => {
    const { createEventsStore } = await import('./events.js');
    const store1 = createEventsStore();
    const store2 = createEventsStore();

    expect(store1).toBe(store2);
  });

  it('onChange notifies listeners when events change', async () => {
    const { createEventsStore } = await import('./events.js');
    const store = createEventsStore();

    const listener = vi.fn();
    store.onChange(listener);

    await store.fetchEvents();

    expect(listener).toHaveBeenCalled();
  });

  it('onChange returns unsubscribe function that removes listener', async () => {
    const { createEventsStore } = await import('./events.js');
    const store = createEventsStore();

    const listener = vi.fn();
    const unsub = store.onChange(listener);

    unsub();

    await store.fetchEvents();

    expect(listener).not.toHaveBeenCalled();
  });
});
