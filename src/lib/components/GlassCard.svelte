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

  const paddingMap: Record<string, string> = {
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

  const useCardBody = $derived(variant === 'default' || variant === 'elevated' || variant === 'flat');

  const hoverClasses = $derived(
    hover
      ? 'hover:border-[--border-strong] hover:scale-[1.002] cursor-pointer transition-all'
      : ''
  );
</script>

<div
  data-testid="card"
  data-variant={variant}
  class="card relative bg-base-200 border border-[--border] rounded-xl shadow-xl {variantClasses[variant] ?? ''} {hoverClasses}"
>
  <span data-testid="card-grid-tick" class="absolute top-2 right-2 text-xs opacity-30 font-mono select-none">+</span>
  {#if useCardBody}
    <div class="card-body {paddingMap[padding]}">
      {@render children?.()}
    </div>
  {:else}
    {@render children?.()}
  {/if}
</div>
