<script lang="ts">
  interface FeedFilters {
    module: string | null;
    timeRange: string;
    agentOnly: boolean;
  }

  let { onFilter }: { onFilter: (filters: FeedFilters) => void } = $props();

  let selectedModule: string | null = $state(null);
  let selectedTimeRange: string = $state('24h');
  let agentOnly: boolean = $state(false);

  const modules: { label: string; value: string | null }[] = [
    { label: 'All', value: null },
    { label: 'Research', value: 'research' },
    { label: 'Writing', value: 'writing' },
    { label: 'Publish', value: 'publish' },
    { label: 'System', value: 'system' }
  ];

  const timeRanges: { label: string; value: string }[] = [
    { label: '1h', value: '1h' },
    { label: '24h', value: '24h' },
    { label: '7d', value: '7d' },
    { label: '30d', value: '30d' },
    { label: 'All', value: 'all' }
  ];

  function emitFilter() {
    onFilter({ module: selectedModule, timeRange: selectedTimeRange, agentOnly });
  }

  function selectModule(value: string | null) {
    selectedModule = value;
    emitFilter();
  }

  function selectTimeRange(value: string) {
    selectedTimeRange = value;
    emitFilter();
  }

  function toggleAgentOnly() {
    agentOnly = !agentOnly;
    emitFilter();
  }
</script>

<div class="flex flex-wrap items-center gap-4" data-testid="orchestration-feed-filters">
  <div class="flex flex-wrap gap-1">
    {#each modules as mod}
      <button
        class="btn btn-sm {selectedModule === mod.value ? 'btn-primary' : 'btn-ghost'}"
        data-testid="module-{mod.value ?? 'all'}"
        onclick={() => selectModule(mod.value)}
      >
        {mod.label}
      </button>
    {/each}
  </div>

  <div class="flex flex-wrap gap-1">
    {#each timeRanges as range}
      <button
        class="btn btn-sm {selectedTimeRange === range.value ? 'btn-primary' : 'btn-ghost'}"
        data-testid={range.value === 'all' ? 'time-range-all' : undefined}
        onclick={() => selectTimeRange(range.value)}
      >
        {range.label}
      </button>
    {/each}
  </div>

  <label class="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      class="checkbox checkbox-sm checkbox-primary"
      checked={agentOnly}
      onchange={toggleAgentOnly}
      aria-label="Agent events only"
    />
    <span class="text-sm">Agent events only</span>
  </label>
</div>
