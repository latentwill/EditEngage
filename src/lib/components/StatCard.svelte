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
  class="backdrop-blur-[20px] bg-[var(--glass-bg,rgba(255,255,255,0.08))] border border-[var(--glass-border,rgba(255,255,255,0.08))] rounded-xl p-4 min-w-[140px]"
>
  <div data-testid="stat-label" class="text-xs text-white/50 uppercase tracking-wide mb-1">
    {label}
  </div>
  <div data-testid="stat-value" class="text-2xl font-bold text-white">
    {value}
  </div>
  {#if trend}
    <div data-testid="stat-trend" class="text-xs mt-1 text-emerald-400">
      {trend}
    </div>
  {/if}
</div>
