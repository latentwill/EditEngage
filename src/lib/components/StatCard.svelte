<script lang="ts">
  let {
    label,
    value,
    trend
  }: {
    label: string;
    value: string;
    trend?: string;
  } = $props();
</script>

<div
  data-testid="stat-card"
  class="stat bg-base-200 rounded-xl p-4 min-w-[140px]"
>
  <div data-testid="stat-label" class="stat-title text-xs uppercase tracking-wide mb-1">
    {label}
  </div>
  <div data-testid="stat-value" class="stat-value text-2xl font-bold">
    {value}
  </div>
  {#if trend}
    <div data-testid="stat-trend" class="stat-desc text-xs mt-1 text-primary">
      {trend}
    </div>
  {/if}
</div>
