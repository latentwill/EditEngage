<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createEventsStore, type EventRow } from '../stores/events.js';

  const store = createEventsStore();
  let events: EventRow[] = $state([]);

  const MS_PER_MINUTE = 60_000;
  const MS_PER_HOUR = 3_600_000;
  const MS_PER_DAY = 86_400_000;

  function formatRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < MS_PER_MINUTE) return 'just now';
    if (diff < MS_PER_HOUR) return `${Math.floor(diff / MS_PER_MINUTE)}m ago`;
    if (diff < MS_PER_DAY) return `${Math.floor(diff / MS_PER_HOUR)}h ago`;
    return `${Math.floor(diff / MS_PER_DAY)}d ago`;
  }

  function getEventIcon(eventType: string): string {
    if (eventType.startsWith('pipeline.')) return 'play';
    if (eventType.startsWith('content.')) return 'document';
    if (eventType.startsWith('topic.')) return 'tag';
    return 'info';
  }

  let unsubscribeOnChange: (() => void) | null = null;

  onMount(async () => {
    await store.fetchEvents();
    events = store.events;
    store.subscribe();

    unsubscribeOnChange = store.onChange(() => {
      events = store.events;
    });
  });

  onDestroy(() => {
    unsubscribeOnChange?.();
    store.unsubscribe();
  });
</script>

<div data-testid="activity-feed" class="space-y-2">
  {#each events as event (event.id)}
    <div data-testid="activity-item" class="flex items-start gap-3 p-3 rounded-lg bg-base-200/50 border border-base-300">
      <span data-testid="event-icon" class="mt-0.5 text-emerald-400">
        {#if getEventIcon(event.event_type) === 'play'}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        {:else if getEventIcon(event.event_type) === 'document'}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        {:else if getEventIcon(event.event_type) === 'tag'}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        {/if}
      </span>
      <div class="flex-1 min-w-0">
        <p class="text-sm text-base-content/80 truncate">{event.description}</p>
        <span data-testid="event-time" class="text-xs text-base-content/40">{formatRelativeTime(event.created_at)}</span>
      </div>
    </div>
  {/each}
</div>
