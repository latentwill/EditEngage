<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createEventsStore, type EventRow } from '../stores/events.js';
  import { createWorkflowLogStore } from '../stores/workflowLogStore.js';

  const store = createEventsStore();
  const logStore = createWorkflowLogStore();
  let latestEvent: EventRow | null = $state(null);
  let animating = $state(false);
  let previousEventId = $state('');
  let expanded = $state(false);
  let previousLogCount = $state(0);

  const ACTIVE_THRESHOLD_MS = 5 * 60_000;

  function formatTimestamp(dateStr: string): string {
    const date = new Date(dateStr);
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `[${h}:${m}:${s}]`;
  }

  function isActive(): boolean {
    if (logStore.isActive) return true;
    if (!latestEvent) return false;
    const diffMs = Date.now() - new Date(latestEvent.created_at).getTime();
    return diffMs < ACTIVE_THRESHOLD_MS;
  }

  function handleClick() {
    window.dispatchEvent(new CustomEvent('openNotificationCenter'));
  }

  function handleExpandClick(e: MouseEvent) {
    e.stopPropagation();
    expanded = !expanded;
  }

  function getDisplayText(): string {
    const logs = logStore.logs;
    if (logs.length > 0) {
      const latest = logs[logs.length - 1];
      return `[${latest.workflowName}] ${latest.message}`;
    }
    if (latestEvent) {
      return latestEvent.description;
    }
    return '';
  }

  function getDisplayTimestamp(): string {
    const logs = logStore.logs;
    if (logs.length > 0) {
      return formatTimestamp(logs[logs.length - 1].timestamp);
    }
    if (latestEvent) {
      return formatTimestamp(latestEvent.created_at);
    }
    return '';
  }

  let unsubscribeOnChange: (() => void) | null = null;
  let logPollInterval: ReturnType<typeof setInterval> | null = null;

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

    // Poll workflow log store for changes (store is plain object, not reactive across components)
    previousLogCount = logStore.logs.length;
    logPollInterval = setInterval(() => {
      if (logStore.logs.length !== previousLogCount) {
        previousLogCount = logStore.logs.length;
        animating = true;
        setTimeout(() => { animating = false; }, 500);
      }
    }, 100);
  });

  onDestroy(() => {
    unsubscribeOnChange?.();
    store.unsubscribe();
    if (logPollInterval) clearInterval(logPollInterval);
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  data-testid="ticker"
  onclick={handleClick}
  class="fixed bottom-0 left-0 right-0 z-50 bg-base-100 border-t border-[--border] px-4 py-2 cursor-pointer font-mono text-base-content flex flex-col {expanded ? 'expanded' : ''}"
>
  <div class="flex items-center gap-3">
    <span
      data-testid="ticker-status-dot"
      class="w-2 h-2 rounded-full {isActive() ? 'bg-primary ring-2 ring-primary/50 animate-pulse' : 'bg-gray-500'}"
    ></span>
    {#if getDisplayText()}
      <span data-testid="ticker-prompt" class="text-primary">^</span>
      <span data-testid="ticker-text" class="flex-1 text-sm truncate {animating ? 'ticker-animate' : ''}">
        {getDisplayText()}
      </span>
      <span data-testid="ticker-time" class="text-xs text-base-content/40 shrink-0">
        {getDisplayTimestamp()}
      </span>
    {:else}
      <span data-testid="ticker-text" class="flex-1 text-sm text-base-content/40">
        No recent activity
      </span>
    {/if}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <span
      data-testid="ticker-expand-btn"
      class="text-xs text-base-content/40 hover:text-base-content/70 cursor-pointer select-none"
      onclick={handleExpandClick}
    >
      {expanded ? 'v' : '^'}
    </span>
  </div>

  {#if expanded && logStore.logs.length > 0}
    <div class="mt-2 max-h-40 overflow-y-auto space-y-1 border-t border-base-300 pt-2">
      {#each logStore.logs as log}
        <div class="text-xs text-base-content/60">
          <span class="text-base-content/40">{formatTimestamp(log.timestamp)}</span>
          <span class="text-primary/70">[{log.workflowName}]</span>
          <span>{log.agentName}: {log.message}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>
