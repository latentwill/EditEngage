<script lang="ts">
  let {
    label,
    value,
    trend,
    trendDirection
  }: {
    label: string;
    value: string;
    trend?: string;
    trendDirection?: 'up' | 'down' | 'neutral';
  } = $props();

  const trendColorClass = $derived(() => {
    if (trendDirection === 'up') return 'text-primary';
    if (trendDirection === 'down') return 'text-error';
    if (trendDirection === 'neutral') return '';
    if (trend?.startsWith('+')) return 'text-primary';
    if (trend?.startsWith('-')) return 'text-error';
    return 'text-primary';
  });
</script>

<div
  data-testid="stat-card"
  class="stat bg-base-200 rounded-xl p-4 min-w-[140px]"
>
  <div data-testid="stat-label" class="stat-title font-mono text-xs uppercase tracking-widest text-base-content/40 mb-1">
    {label}
  </div>
  <div data-testid="stat-value" class="stat-value text-4xl font-bold text-base-content">
    {value}
  </div>
  {#if trend}
    <div data-testid="stat-trend" class="stat-desc text-xs mt-1 {trendColorClass()}">
      {trend}
    </div>
  {/if}
</div>
