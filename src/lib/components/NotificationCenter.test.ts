/**
 * @behavior NotificationCenter renders notifications grouped by tier with distinct
 * visual styling: alerts get red borders, updates get emerald borders, digests get muted styling.
 * @business_rule Users must be able to visually distinguish notification urgency at a glance,
 * and can mark individual or all notifications as read.
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Database } from '../types/database.js';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];

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

function makeNotification(overrides: Partial<NotificationRow> = {}): NotificationRow {
  return {
    id: `notif-${Math.random().toString(36).slice(2, 8)}`,
    user_id: 'user-1',
    project_id: 'proj-1',
    event_id: 'evt-1',
    title: 'Test notification',
    message: 'Test message',
    is_read: false,
    tier: 'update',
    created_at: new Date().toISOString(),
    ...overrides
  };
}

const mockInReturn = { data: null, error: null };
const mockEqReturn = { data: null, error: null };
const mockUpdateReturn = {
  eq: vi.fn().mockReturnValue(mockEqReturn),
  in: vi.fn().mockReturnValue(mockInReturn)
};

let currentNotifications: NotificationRow[] = [];

const mockSelectReturn = {
  order: vi.fn().mockReturnValue({
    limit: vi.fn().mockImplementation(() =>
      Promise.resolve({ data: currentNotifications, error: null })
    )
  })
};

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
    currentNotifications = [];
    mockOn.mockReturnValue(mockChannel);
    mockSubscribe.mockReturnValue(mockChannel);
    mockClient.from.mockReturnValue(mockFromReturn);
    mockFromReturn.select.mockReturnValue(mockSelectReturn);
    mockFromReturn.update.mockReturnValue(mockUpdateReturn);
    mockSelectReturn.order.mockReturnValue({
      limit: vi.fn().mockImplementation(() =>
        Promise.resolve({ data: currentNotifications, error: null })
      )
    });
    mockUpdateReturn.eq.mockReturnValue(mockEqReturn);
    mockUpdateReturn.in.mockReturnValue(mockInReturn);
    mockClient.channel.mockReturnValue(mockChannel);
  });

  it('renders notification items', async () => {
    currentNotifications = [
      makeNotification({ id: 'n1', title: 'First' }),
      makeNotification({ id: 'n2', title: 'Second' })
    ];
    render(NotificationCenter, { props: { open: true } });

    await vi.waitFor(() => {
      expect(screen.getAllByTestId('notification-item')).toHaveLength(2);
    });
  });

  it('alert-tier notifications show alert styling with red border', async () => {
    currentNotifications = [
      makeNotification({ id: 'alert-1', tier: 'alert', title: 'Pipeline failed' })
    ];
    render(NotificationCenter, { props: { open: true } });

    await vi.waitFor(() => {
      expect(screen.getAllByTestId('notification-item')).toHaveLength(1);
    });

    const item = screen.getByTestId('notification-item');
    expect(item.className).toContain('border-red');
  });

  it('update-tier notifications show update styling with emerald border', async () => {
    currentNotifications = [
      makeNotification({ id: 'update-1', tier: 'update', title: 'Pipeline completed' })
    ];
    render(NotificationCenter, { props: { open: true } });

    await vi.waitFor(() => {
      expect(screen.getAllByTestId('notification-item')).toHaveLength(1);
    });

    const item = screen.getByTestId('notification-item');
    expect(item.className).toContain('border-emerald');
  });

  it('digest-tier notifications show digest styling with muted border', async () => {
    currentNotifications = [
      makeNotification({ id: 'digest-1', tier: 'digest', title: 'Topic queued' })
    ];
    render(NotificationCenter, { props: { open: true } });

    await vi.waitFor(() => {
      expect(screen.getAllByTestId('notification-item')).toHaveLength(1);
    });

    const item = screen.getByTestId('notification-item');
    expect(item.className).toContain('border-base-content/20');
  });

  it('shows tier badge on each notification', async () => {
    currentNotifications = [
      makeNotification({ id: 'badge-1', tier: 'alert', title: 'Failed' })
    ];
    render(NotificationCenter, { props: { open: true } });

    await vi.waitFor(() => {
      expect(screen.getAllByTestId('tier-badge')).toHaveLength(1);
    });

    const badge = screen.getByTestId('tier-badge');
    expect(badge.textContent).toContain('alert');
  });

  it('mark as read works when clicking a notification', async () => {
    currentNotifications = [
      makeNotification({ id: 'notif-click', title: 'Click me' })
    ];
    render(NotificationCenter, { props: { open: true } });

    await vi.waitFor(() => {
      expect(screen.getAllByTestId('notification-item')).toHaveLength(1);
    });

    const item = screen.getByTestId('notification-item');
    await fireEvent.click(item);

    expect(mockClient.from).toHaveBeenCalledWith('notifications');
    expect(mockFromReturn.update).toHaveBeenCalledWith({ is_read: true });
    expect(mockUpdateReturn.eq).toHaveBeenCalledWith('id', 'notif-click');
  });

  it('mark all as read uses batch query with .in()', async () => {
    currentNotifications = [
      makeNotification({ id: 'unread-1', is_read: false, title: 'Unread 1' }),
      makeNotification({ id: 'unread-2', is_read: false, title: 'Unread 2' })
    ];
    render(NotificationCenter, { props: { open: true } });

    await vi.waitFor(() => {
      expect(screen.getAllByTestId('notification-item')).toHaveLength(2);
    });

    const markAllBtn = screen.getByTestId('mark-all-read');
    await fireEvent.click(markAllBtn);

    await vi.waitFor(() => {
      expect(mockFromReturn.update).toHaveBeenCalledWith({ is_read: true });
      expect(mockUpdateReturn.in).toHaveBeenCalledWith('id', ['unread-1', 'unread-2']);
    });
  });
});
