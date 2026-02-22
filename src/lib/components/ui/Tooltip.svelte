<script lang="ts">
  import { createTooltip, melt } from '@melt-ui/svelte';
  import type { Snippet } from 'svelte';

  let { text = '', children }: { text: string; children?: Snippet } = $props();

  const {
    elements: { trigger, content },
    states: { open }
  } = createTooltip({
    openDelay: 600,
    closeDelay: 0,
    forceVisible: true,
  });
</script>

<span use:melt={$trigger} data-testid="tooltip-trigger">
  {#if children}
    {@render children()}
  {/if}
</span>

{#if $open}
  <div use:melt={$content} data-testid="tooltip-content" class="bg-base-300 text-xs rounded-md px-2 py-1 z-50">
    {text}
  </div>
{/if}
