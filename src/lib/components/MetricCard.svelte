<script lang="ts">
  let {
    label,
    value,
    trend,
    sparklineData
  }: {
    label: string;
    value: string | number;
    trend: number;
    sparklineData: number[];
  } = $props();

  const trendClass = $derived(trend > 0 ? 'text-success' : trend < 0 ? 'text-error' : '');
  const trendDisplay = $derived(Math.abs(trend) + '%');

  const sparklinePoints = $derived(() => {
    if (sparklineData.length === 0) return '';
    const max = Math.max(...sparklineData);
    const min = Math.min(...sparklineData);
    const range = max - min || 1;
    const width = 100;
    const height = 30;
    const step = width / (sparklineData.length - 1 || 1);
    return sparklineData
      .map((d, i) => `${i * step},${height - ((d - min) / range) * height}`)
      .join(' ');
  });
</script>

<div
  data-testid="metric-card"
  class="backdrop-blur-md bg-base-200/60 border border-base-content/10 rounded-xl p-4"
>
  <div data-testid="metric-label" class="font-mono text-xs uppercase tracking-widest text-base-content/40 mb-1">
    {label}
  </div>
  <div data-testid="metric-value" class="text-3xl font-bold text-base-content">
    {value}
  </div>
  {#if trend !== 0}
    <div data-testid="metric-trend" class="text-sm mt-1 flex items-center gap-1 {trendClass}">
      {#if trend > 0}
        <span data-testid="trend-arrow-up">&#9650;</span>
      {:else}
        <span data-testid="trend-arrow-down">&#9660;</span>
      {/if}
      {trendDisplay}
    </div>
  {/if}
  {#if sparklineData.length > 0}
    <svg data-testid="metric-sparkline" viewBox="0 0 100 30" class="w-full h-8 mt-2" preserveAspectRatio="none">
      <polyline
        points={sparklinePoints()}
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  {/if}
</div>
