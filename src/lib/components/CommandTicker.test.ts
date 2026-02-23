/**
 * @behavior CommandTicker displays latest event in a persistent status bar with terminal styling
 * @business_rule Users always see the most recent system event at the bottom of the viewport
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

const mockOn = vi.fn().mockReturnThis();
const mockSubscribe = vi.fn().mockReturnThis();
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
    description: 'Workflow "SEO Articles" started',
    metadata: {},
    is_read: false,
    created_at: new Date(Date.now() - 30 * 1000).toISOString() // 30 seconds ago
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

import CommandTicker from './CommandTicker.svelte';

describe('CommandTicker', () => {
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

  it('renders latest event text and timestamp', async () => {
    render(CommandTicker);

    await vi.waitFor(() => {
      const ticker = screen.getByTestId('ticker');
      expect(ticker.textContent).toContain('Workflow "SEO Articles" started');
    });

    expect(screen.getByTestId('ticker-time')).not.toBeNull();
  });

  it('has animation CSS class for scroll transition when new event arrives', async () => {
    render(CommandTicker);

    // Wait for initial data to load and subscribe
    await vi.waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled();
    });

    // Simulate a new real-time event via the store's channel callback
    const onCallback = mockOn.mock.calls[0][2];
    const newEvent = {
      id: 'evt-2',
      project_id: 'proj-1',
      event_type: 'content.published',
      description: 'Article "New Post" published',
      metadata: {},
      is_read: false,
      created_at: new Date().toISOString()
    };

    onCallback({ new: newEvent });

    await vi.waitFor(() => {
      const tickerText = screen.getByTestId('ticker-text');
      expect(tickerText.className).toContain('ticker-animate');
    });
  });

  it('click dispatches openNotificationCenter custom event', async () => {
    render(CommandTicker);

    await vi.waitFor(() => {
      expect(screen.getByTestId('ticker')).toBeDefined();
    });

    const handler = vi.fn();
    window.addEventListener('openNotificationCenter', handler);

    const ticker = screen.getByTestId('ticker');
    await fireEvent.click(ticker);

    expect(handler).toHaveBeenCalled();

    window.removeEventListener('openNotificationCenter', handler);
  });

  it('subscribes to same real-time channel as ActivityFeed via events store', async () => {
    render(CommandTicker);

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

  it('shows status dot with primary color when active', async () => {
    render(CommandTicker);

    await vi.waitFor(() => {
      const ticker = screen.getByTestId('ticker');
      expect(ticker.textContent).toContain('Workflow "SEO Articles" started');
    });

    const dot = screen.getByTestId('ticker-status-dot');
    expect(dot.className).toContain('bg-primary');
  });

  // --- NEW TESTS (T12) ---

  it('renders caret prefix in ticker prompt', async () => {
    render(CommandTicker);

    await vi.waitFor(() => {
      const ticker = screen.getByTestId('ticker');
      expect(ticker.textContent).toContain('Workflow "SEO Articles" started');
    });

    const prompt = screen.getByTestId('ticker-prompt');
    expect(prompt.textContent).toContain('^');
  });

  it('renders timestamp in HH:MM:SS format', async () => {
    render(CommandTicker);

    await vi.waitFor(() => {
      const ticker = screen.getByTestId('ticker');
      expect(ticker.textContent).toContain('Workflow "SEO Articles" started');
    });

    const time = screen.getByTestId('ticker-time');
    // Should match pattern like [14:30:05]
    expect(time.textContent).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
  });

  it('shows pulse ring on status dot when active', async () => {
    render(CommandTicker);

    await vi.waitFor(() => {
      const ticker = screen.getByTestId('ticker');
      expect(ticker.textContent).toContain('Workflow "SEO Articles" started');
    });

    const dot = screen.getByTestId('ticker-status-dot');
    expect(dot.className).toContain('ring-');
    expect(dot.className).toContain('animate-pulse');
  });

  it('ticker is fixed to bottom of viewport', async () => {
    render(CommandTicker);

    await vi.waitFor(() => {
      expect(screen.getByTestId('ticker')).toBeDefined();
    });

    const ticker = screen.getByTestId('ticker');
    expect(ticker.className).toContain('fixed');
    expect(ticker.className).toContain('bottom-0');
  });

  it('ticker uses monospace font', async () => {
    render(CommandTicker);

    await vi.waitFor(() => {
      expect(screen.getByTestId('ticker')).toBeDefined();
    });

    const ticker = screen.getByTestId('ticker');
    expect(ticker.className).toContain('font-mono');
  });
});
