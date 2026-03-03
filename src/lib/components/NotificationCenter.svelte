<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createSupabaseClient } from '../supabase.js';
  import type { Database } from '../types/database.js';
  import NotificationBadge from './NotificationBadge.svelte';

  type NotificationRow = Database['public']['Tables']['notifications']['Row'];

  let { open = false }: { open?: boolean } = $props();

  const client = createSupabaseClient();
  let notifications: NotificationRow[] = $state([]);
  let channel: ReturnType<typeof client.channel> | null = null;

  function unreadCount(): number {
    return notifications.filter((n) => !n.is_read).length;
  }

  async function fetchNotifications() {
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data && !error) {
      notifications = data;
    }
  }

  async function markAsRead(id: string) {
    await client.from('notifications').update({ is_read: true }).eq('id', id);
    notifications = notifications.map((n) =>
      n.id === id ? { ...n, is_read: true } : n
    );
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await client.from('notifications').update({ is_read: true }).in('id', unreadIds);
    notifications = notifications.map((n) => ({ ...n, is_read: true }));
  }

  function subscribeRealtime() {
    channel = client.channel('notifications-realtime');
    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          notifications = [payload.new as NotificationRow, ...notifications].slice(0, 100);
        }
      )
      .subscribe();
  }

  function tierBorderClass(notification: NotificationRow): string {
    if (notification.tier === 'alert') return 'border-red-500 bg-base-200/30';
    if (notification.tier === 'digest') return 'border-base-content/20';
    // 'update' tier or fallback
    if (!notification.is_read) return 'border-emerald-400 bg-base-200/30';
    return 'border-transparent';
  }

  function tierBadgeClass(tier: string): string {
    if (tier === 'alert') return 'bg-red-500/20 text-red-400';
    if (tier === 'digest') return 'bg-base-content/10 text-base-content/50';
    return 'bg-emerald-500/20 text-emerald-400';
  }

  onMount(async () => {
    await fetchNotifications();
    subscribeRealtime();
  });

  onDestroy(() => {
    channel?.unsubscribe();
  });
</script>

{#if open}
  <div data-testid="notification-center" class="fixed top-0 right-0 bottom-0 w-96 z-50 bg-base-100/95 backdrop-blur-md border-l border-base-300 flex flex-col">
    <div class="flex items-center justify-between p-4 border-b border-base-300">
      <div class="flex items-center gap-2">
        <div class="relative">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-base-content"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <NotificationBadge count={unreadCount()} />
        </div>
        <h2 class="text-base-content font-medium">Notifications</h2>
      </div>
      <button
        data-testid="mark-all-read"
        onclick={markAllAsRead}
        class="text-xs text-emerald-400 hover:text-emerald-300"
      >
        Mark all as read
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      {#each notifications as notification (notification.id)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          data-testid="notification-item"
          onclick={() => markAsRead(notification.id)}
          class="p-3 rounded-lg cursor-pointer transition-colors hover:bg-base-200 border-l-2 {tierBorderClass(notification)}"
        >
          <div class="flex items-center gap-2">
            <p class="text-sm font-medium {!notification.is_read ? 'text-base-content' : 'text-base-content/60'} {notification.tier === 'digest' ? 'text-sm' : ''}">
              {notification.title}
            </p>
            <span
              data-testid="tier-badge"
              class="text-[10px] px-1.5 py-0.5 rounded-full font-medium {tierBadgeClass(notification.tier)}"
            >
              {notification.tier}
            </span>
          </div>
          <p class="text-xs text-base-content/40 mt-1">{notification.message}</p>
        </div>
      {/each}
    </div>
  </div>
{/if}
