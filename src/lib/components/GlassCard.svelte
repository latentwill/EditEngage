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
    elevated: 'shadow-lg',
    flat: 'shadow-none'
  };
</script>

<div
  data-testid="glass-card"
  data-variant={variant}
  class="backdrop-blur-[20px] bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-glass transition-all duration-300 {variant === 'stat' || variant === 'feature' ? variantClasses[variant] : paddingMap[padding]} {hover ? 'hover:bg-white/[0.12] hover:border-white/[0.20] cursor-pointer' : ''} {variantClasses[variant] ?? ''}"
>
  {@render children?.()}
</div>
