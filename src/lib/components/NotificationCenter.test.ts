/**
 * @behavior NotificationCenter displays notification history with read/unread states and real-time updates
 * @business_rule Users can view all notifications, mark them as read individually or in bulk
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

const mockNotifications = [
  {
    id: 'notif-1',
    user_id: 'user-1',
    project_id: 'proj-1',
    event_id: 'evt-1',
    title: 'Workflow Complete',
    message: 'SEO Articles workflow finished successfully',
    is_read: false,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    id: 'notif-2',
    user_id: 'user-1',
    project_id: 'proj-1',
    event_id: 'evt-2',
    title: 'Content Published',
    message: 'Article "Top 10 Tips" was published to Ghost',
    is_read: true,
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString()
  },
  {
    id: 'notif-3',
    user_id: 'user-1',
    project_id: 'proj-1',
    event_id: 'evt-3',
    title: 'New Topic Added',
    message: 'Topic "AI Trends 2025" was added to queue',
    is_read: false,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  }
];

const mockInReturn = { data: null, error: null };
const mockEqReturn = { data: null, error: null };
const mockUpdateReturn = {
  eq: vi.fn().mockReturnValue(mockEqReturn),
  in: vi.fn().mockReturnValue(mockInReturn)
};

const mockLimitReturn = { data: mockNotifications, error: null };
const mockOrderReturn = { limit: vi.fn().mockReturnValue(mockLimitReturn) };
const mockSelectReturn = { order: vi.fn().mockReturnValue(mockOrderReturn) };
const mockFromReturn = {
  select: vi.fn().mockReturnValue(mockSelectReturn),
  update: vi.fn().mockReturnValue(mockUpdateReturn)
};

const mockClient = {
  from: vi.fn().mockReturnValue(mockFromReturn),
  channel: vi.fn().mockReturnValue(mockChannel)
};

vi.mock('$lib/supabase', () => ({
  createSupabaseClient: vi.fn(() => mockClient)
}));

import NotificationCenter from './NotificationCenter.svelte';

describe('NotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOn.mockReturnValue(mockChannel);
    mockSubscribe.mockReturnValue(mockChannel);
    mockClient.from.mockReturnValue(mockFromReturn);
    mockFromReturn.select.mockReturnValue(mockSelectReturn);
    mockFromReturn.update.mockReturnValue(mockUpdateReturn);
    mockSelectReturn.order.mockReturnValue(mockOrderReturn);
    mockOrderReturn.limit.mockReturnValue(mockLimitReturn);
    mockUpdateReturn.eq.mockReturnValue(mockEqReturn);
    mockUpdateReturn.in.mockReturnValue(mockInReturn);
    mockClient.channel.mockReturnValue(mockChannel);
  });

  it('renders notification list with read/unread styling', async () => {
    render(NotificationCenter, { props: { open: true } });

    await vi.waitFor(() => {
      expect(screen.getAllByTestId('notification-item')).toHaveLength(3);
    });

    const items = screen.getAllByTestId('notification-item');
    // Unread items (notif-1, notif-3) should have emerald border accent
    expect(items[0].className).toContain('border-emerald');
    // Read item (notif-2) should not have emerald border
    expect(items[1].className).not.toContain('border-emerald');
  });

  it('shows unread count badge on bell icon', async () => {
    render(NotificationCenter, { props: { open: true } });

    await vi.waitFor(() => {
      expect(screen.getByTestId('unread-badge')).toBeDefined();
    });

    const badge = screen.getByTestId('unread-badge');
    // 2 unread notifications (notif-1 and notif-3)
    expect(badge.textContent).toContain('2');
  });

  it('clicking a notification marks it as read via Supabase update', async () => {
    render(NotificationCenter, { props: { open: true } });

    await vi.waitFor(() => {
      expect(screen.getAllByTestId('notification-item')).toHaveLength(3);
    });

    // Click the first unread notification
    const items = screen.getAllByTestId('notification-item');
    await fireEvent.click(items[0]);

    expect(mockClient.from).toHaveBeenCalledWith('notifications');
    expect(mockFromReturn.update).toHaveBeenCalledWith({ is_read: true });
    expect(mockUpdateReturn.eq).toHaveBeenCalledWith('id', 'notif-1');
  });

  it('Mark all as read uses single batch query with .in()', async () => {
    render(NotificationCenter, { props: { open: true } });

    // Wait for notifications to load first
    await vi.waitFor(() => {
      expect(screen.getAllByTestId('notification-item')).toHaveLength(3);
    });

    const markAllBtn = screen.getByTestId('mark-all-read');
    await fireEvent.click(markAllBtn);

    // Should have called update with .in() for batch operation
    await vi.waitFor(() => {
      expect(mockFromReturn.update).toHaveBeenCalledWith({ is_read: true });
      expect(mockUpdateReturn.in).toHaveBeenCalledWith('id', ['notif-1', 'notif-3']);
    });
  });

  it('subscribes to real-time updates for new notifications', async () => {
    render(NotificationCenter, { props: { open: true } });

    await vi.waitFor(() => {
      expect(mockClient.channel).toHaveBeenCalledWith('notifications-realtime');
    });

    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      expect.any(Function)
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });
});
