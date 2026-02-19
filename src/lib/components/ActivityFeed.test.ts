/**
 * @behavior ActivityFeed renders events in reverse chronological order with real-time updates
 * @business_rule Users see latest system events immediately via Supabase real-time subscriptions
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

const mockOn = vi.fn().mockReturnThis();
const mockSubscribe = vi.fn().mockReturnThis();
const mockChannelUnsubscribe = vi.fn();
const mockChannel = {
  on: mockOn,
  subscribe: mockSubscribe,
  unsubscribe: mockChannelUnsubscribe
};

const mockEvents = [
  {
    id: 'evt-1',
    project_id: 'proj-1',
    event_type: 'pipeline.started',
    description: 'Workflow "SEO Articles" started',
    metadata: {},
    is_read: false,
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString() // 2 minutes ago
  },
  {
    id: 'evt-2',
    project_id: 'proj-1',
    event_type: 'content.published',
    description: 'Article "Top 10 Tips" published',
    metadata: {},
    is_read: true,
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago
  },
  {
    id: 'evt-3',
    project_id: 'proj-1',
    event_type: 'topic.created',
    description: 'New topic "AI Trends" added',
    metadata: {},
    is_read: false,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
  }
];

const mockLimitReturn = { data: mockEvents, error: null };
const mockOrderReturn = { limit: vi.fn().mockReturnValue(mockLimitReturn) };
const mockSelectReturn = { order: vi.fn().mockReturnValue(mockOrderReturn) };
const mockFromReturn = { select: vi.fn().mockReturnValue(mockSelectReturn) };

const mockClient = {
  from: vi.fn().mockReturnValue(mockFromReturn),
  channel: vi.fn().mockReturnValue(mockChannel)
};

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => mockClient)
}));

import ActivityFeed from './ActivityFeed.svelte';

describe('ActivityFeed', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockOn.mockReturnValue(mockChannel);
    mockSubscribe.mockReturnValue(mockChannel);
    mockClient.from.mockReturnValue(mockFromReturn);
    mockFromReturn.select.mockReturnValue(mockSelectReturn);
    mockSelectReturn.order.mockReturnValue(mockOrderReturn);
    mockOrderReturn.limit.mockReturnValue(mockLimitReturn);
    mockClient.channel.mockReturnValue(mockChannel);

    // Reset singleton between tests
    const { resetEventsStore } = await import('../stores/events.js');
    resetEventsStore();
  });

  it('renders events in reverse chronological order', async () => {
    render(ActivityFeed);

    // Wait for async fetch
    await vi.waitFor(() => {
      const items = screen.getAllByTestId('activity-item');
      expect(items).toHaveLength(3);
    });

    const items = screen.getAllByTestId('activity-item');
    // First item should be most recent (evt-1)
    expect(items[0].textContent).toContain('Workflow "SEO Articles" started');
    expect(items[2].textContent).toContain('New topic "AI Trends" added');
  });

  it('displays event type icon, description, and relative timestamp', async () => {
    render(ActivityFeed);

    await vi.waitFor(() => {
      expect(screen.getAllByTestId('activity-item')).toHaveLength(3);
    });

    const items = screen.getAllByTestId('activity-item');

    // Each item should have an icon area, description, and timestamp
    expect(items[0].querySelector('[data-testid="event-icon"]')).not.toBeNull();
    expect(items[0].textContent).toContain('Workflow "SEO Articles" started');
    expect(items[0].querySelector('[data-testid="event-time"]')).not.toBeNull();
    // Relative timestamp: "2m ago"
    expect(items[0].querySelector('[data-testid="event-time"]')!.textContent).toContain('2m ago');
    // "1h ago"
    expect(items[1].querySelector('[data-testid="event-time"]')!.textContent).toContain('1h ago');
  });

  it('subscribes to Supabase real-time channel on mount', async () => {
    render(ActivityFeed);

    await vi.waitFor(() => {
      expect(mockClient.channel).toHaveBeenCalledWith('events-realtime');
    });

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'events' },
      expect.any(Function)
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('prepends new events when real-time INSERT is received', async () => {
    render(ActivityFeed);

    await vi.waitFor(() => {
      expect(screen.getAllByTestId('activity-item')).toHaveLength(3);
    });

    // Simulate real-time INSERT
    const onCallback = mockOn.mock.calls[0][2];
    const newEvent = {
      id: 'evt-4',
      project_id: 'proj-1',
      event_type: 'pipeline.completed',
      description: 'Workflow "SEO Articles" completed',
      metadata: {},
      is_read: false,
      created_at: new Date().toISOString()
    };

    onCallback({ new: newEvent });

    await vi.waitFor(() => {
      expect(screen.getAllByTestId('activity-item')).toHaveLength(4);
    });

    const items = screen.getAllByTestId('activity-item');
    expect(items[0].textContent).toContain('Workflow "SEO Articles" completed');
  });

  it('unsubscribes from channel on unmount', async () => {
    const { unmount } = render(ActivityFeed);

    await vi.waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled();
    });

    unmount();

    expect(mockChannelUnsubscribe).toHaveBeenCalled();
  });
});
