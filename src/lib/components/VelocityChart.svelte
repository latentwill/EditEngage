<script lang="ts">
  let {
    data
  }: {
    data: Array<{ date: string; count: number }>;
  } = $props();

  const width = 400;
  const height = 120;
  const padding = 4;

  const pathD = $derived(() => {
    if (data.length === 0) return '';
    const max = Math.max(...data.map(d => d.count), 1);
    const stepX = (width - padding * 2) / (data.length - 1 || 1);
    const points = data.map((d, i) => {
      const x = padding + i * stepX;
      const y = height - padding - ((d.count / max) * (height - padding * 2));
      return `${x},${y}`;
    });
    return `M${points.join(' L')}`;
  });

  const areaD = $derived(() => {
    if (data.length === 0) return '';
    const max = Math.max(...data.map(d => d.count), 1);
    const stepX = (width - padding * 2) / (data.length - 1 || 1);
    const points = data.map((d, i) => {
      const x = padding + i * stepX;
      const y = height - padding - ((d.count / max) * (height - padding * 2));
      return `${x},${y}`;
    });
    const lastX = padding + (data.length - 1) * stepX;
    const firstX = padding;
    const baseline = height - padding;
    return `M${firstX},${baseline} L${points.join(' L')} L${lastX},${baseline} Z`;
  });
</script>

<div class="card bg-base-200 rounded-xl p-4">
  <h2 data-testid="velocity-chart-heading" class="text-sm font-semibold text-base-content/70 uppercase tracking-wide mb-3">
    Content Velocity
  </h2>
  <svg
    data-testid="velocity-chart"
    viewBox="0 0 {width} {height}"
    class="w-full h-32"
    preserveAspectRatio="none"
  >
    {#if data.length > 0}
      <path
        d={areaD()}
        fill="currentColor"
        fill-opacity="0.1"
      />
      <path
        d={pathD()}
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    {/if}
  </svg>
</div>
