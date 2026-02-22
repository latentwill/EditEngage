<script lang="ts">
  import { createSelect, melt } from '@melt-ui/svelte';

  type SelectOption = { value: string; label: string };

  let { options = [], placeholder = 'Select...' }: { options: SelectOption[]; placeholder?: string } = $props();

  const {
    elements: { trigger, menu, option },
    states: { selectedLabel, open },
    helpers: { isSelected }
  } = createSelect<string>({
    forceVisible: true,
  });
</script>

<button use:melt={$trigger} data-testid="select-trigger" class="input input-bordered flex items-center justify-between w-full text-left">
  <span>{$selectedLabel || placeholder}</span>
  <span class="text-primary">&#9662;</span>
</button>

{#if $open}
  <div use:melt={$menu} data-testid="select-menu" class="bg-base-200 rounded-lg shadow-lg p-1 z-50">
    {#each options as opt}
      <div
        use:melt={$option({ value: opt.value, label: opt.label })}
        data-testid="select-option"
        class="px-3 py-2 rounded cursor-pointer hover:bg-base-300 {$isSelected(opt.value) ? 'bg-base-300 border-l-2 border-primary' : ''}"
      >
        {opt.label}
      </div>
    {/each}
  </div>
{/if}
