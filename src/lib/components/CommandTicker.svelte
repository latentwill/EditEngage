<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createEventsStore, type EventRow } from '../stores/events.js';

  const store = createEventsStore();
  let latestEvent: EventRow | null = $state(null);
  let animating = $state(false);
  let previousEventId = $state('');

  const MS_PER_MINUTE = 60_000;
  const MS_PER_HOUR = 3_600_000;
  const MS_PER_DAY = 86_400_000;
  const ACTIVE_THRESHOLD_MS = 5 * MS_PER_MINUTE;

  function formatRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < MS_PER_MINUTE) return 'just now';
    if (diff < MS_PER_HOUR) return `${Math.floor(diff / MS_PER_MINUTE)}m ago`;
    if (diff < MS_PER_DAY) return `${Math.floor(diff / MS_PER_HOUR)}h ago`;
    return `${Math.floor(diff / MS_PER_DAY)}d ago`;
  }

  function isActive(): boolean {
    if (!latestEvent) return false;
    const diffMs = Date.now() - new Date(latestEvent.created_at).getTime();
    return diffMs < ACTIVE_THRESHOLD_MS;
  }

  function handleClick() {
    window.dispatchEvent(new CustomEvent('openNotificationCenter'));
  }

  let unsubscribeOnChange: (() => void) | null = null;

  onMount(async () => {
    await store.fetchEvents();
    if (store.events.length > 0) {
      latestEvent = store.events[0];
      previousEventId = latestEvent.id;
    }
    store.subscribe();

    unsubscribeOnChange = store.onChange(() => {
      if (store.events.length > 0 && store.events[0].id !== previousEventId) {
        previousEventId = store.events[0].id;
        animating = true;
        latestEvent = store.events[0];
        setTimeout(() => { animating = false; }, 500);
      }
    });
  });

  onDestroy(() => {
    unsubscribeOnChange?.();
    store.unsubscribe();
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  data-testid="command-ticker"
  onclick={handleClick}
  class="fixed bottom-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-sm border-t border-white/[0.08] px-4 py-2 cursor-pointer font-mono text-emerald-400 flex items-center gap-3"
>
  <span
    data-testid="status-dot"
    class="w-2 h-2 rounded-full {isActive() ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}"
  ></span>
  {#if latestEvent}
    <span data-testid="ticker-text" class="flex-1 text-sm truncate {animating ? 'ticker-animate' : ''}">
      {latestEvent.description}
    </span>
    <span data-testid="ticker-time" class="text-xs text-white/40 shrink-0">
      {formatRelativeTime(latestEvent.created_at)}
    </span>
  {:else}
    <span data-testid="ticker-text" class="flex-1 text-sm text-white/40">
      No recent activity
    </span>
  {/if}
</div>
