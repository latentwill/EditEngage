<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    variant = 'default',
    hover = false,
    padding = 'md',
    children
  }: {
    variant?: 'default' | 'stat' | 'feature' | 'elevated' | 'flat';
    hover?: boolean;
    padding?: 'sm' | 'md' | 'lg';
    children?: Snippet;
  } = $props();

  const paddingMap = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const variantClasses: Record<string, string> = {
    default: '',
    stat: 'p-4 min-w-[140px] text-center',
    feature: 'p-6 flex flex-col gap-3',
    elevated: 'shadow-2xl',
    flat: 'shadow-none'
  };

  const useCardBody = variant === 'default' || variant === 'elevated' || variant === 'flat';
</script>

<div
  data-testid="glass-card"
  data-variant={variant}
  class="card bg-base-200 shadow-xl {variantClasses[variant] ?? ''} {hover ? 'hover:bg-base-300 cursor-pointer transition-colors' : ''}"
>
  {#if useCardBody}
    <div class="card-body {paddingMap[padding]}">
      {@render children?.()}
    </div>
  {:else}
    {@render children?.()}
  {/if}
</div>
