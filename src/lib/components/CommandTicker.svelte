<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createEventsStore, type EventRow } from '../stores/events.js';

  const store = createEventsStore();
  let latestEvent: EventRow | null = $state(null);
  let animating = $state(false);
  let previousEventId = $state('');

  const ACTIVE_THRESHOLD_MS = 5 * 60_000;

  function formatTimestamp(dateStr: string): string {
    const date = new Date(dateStr);
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `[${h}:${m}:${s}]`;
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
  data-testid="ticker"
  onclick={handleClick}
  class="fixed bottom-0 left-0 right-0 z-50 bg-base-100 border-t border-[--border] px-4 py-2 cursor-pointer font-mono text-base-content flex items-center gap-3"
>
  <span
    data-testid="ticker-status-dot"
    class="w-2 h-2 rounded-full {isActive() ? 'bg-primary ring-2 ring-primary/50 animate-pulse' : 'bg-gray-500'}"
  ></span>
  {#if latestEvent}
    <span data-testid="ticker-prompt" class="text-primary">^</span>
    <span data-testid="ticker-text" class="flex-1 text-sm truncate {animating ? 'ticker-animate' : ''}">
      {latestEvent.description}
    </span>
    <span data-testid="ticker-time" class="text-xs text-base-content/40 shrink-0">
      {formatTimestamp(latestEvent.created_at)}
    </span>
  {:else}
    <span data-testid="ticker-text" class="flex-1 text-sm text-base-content/40">
      No recent activity
    </span>
  {/if}
</div>
