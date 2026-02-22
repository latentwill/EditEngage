<script lang="ts">
  import { createDialog, melt } from '@melt-ui/svelte';
  import type { Snippet } from 'svelte';

  let { triggerLabel = 'Open', children }: { triggerLabel?: string; children?: Snippet } = $props();

  const {
    elements: { trigger, overlay, content, close, portalled },
    states: { open }
  } = createDialog();
</script>

<button use:melt={$trigger} data-testid="dialog-trigger" class="btn btn-primary">
  {triggerLabel}
</button>

{#if $open}
  <div use:melt={$portalled}>
    <div use:melt={$overlay} data-testid="dialog-overlay" class="fixed inset-0 bg-black/50 z-40"></div>
    <div
      use:melt={$content}
      data-testid="dialog-content"
      class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-base-200 border border-[--border-strong] rounded-xl p-6 w-full max-w-md relative"
    >
      <span data-testid="dialog-trace" class="absolute bottom-0 left-0 border-l border-b border-primary w-3 h-3"></span>
      {#if children}
        {@render children()}
      {/if}
      <button use:melt={$close} data-testid="dialog-close" class="absolute top-3 right-3 text-base-content/60 hover:text-base-content">
        ✕
      </button>
    </div>
  </div>
{/if}
