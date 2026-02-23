<script lang="ts">
  import { createCombobox, melt } from '@melt-ui/svelte';

  type ComboboxOption = { value: string; label: string };

  let { options = [], placeholder = 'Search...' }: { options: ComboboxOption[]; placeholder?: string } = $props();

  const {
    elements: { menu, input, option: optionEl },
    states: { open, inputValue, touchedInput },
    helpers: { isSelected }
  } = createCombobox<string>({
    forceVisible: true,
  });

  let filteredOptions = $derived(
    $touchedInput
      ? options.filter((o) => o.label.toLowerCase().includes($inputValue.toLowerCase()))
      : options
  );
</script>

<input
  use:melt={$input}
  data-testid="combobox-input"
  class="input input-bordered w-full"
  placeholder={placeholder}
/>

{#if $open}
  <div use:melt={$menu} data-testid="combobox-menu" class="bg-base-200 rounded-lg shadow-lg p-1 z-50">
    {#if filteredOptions.length === 0}
      <div data-testid="combobox-empty" class="text-base-content/40 text-sm py-4 text-center">
        No results found
      </div>
    {:else}
      {#each filteredOptions as opt}
        <div
          use:melt={$optionEl({ value: opt.value, label: opt.label })}
          data-testid="combobox-option"
          class="px-3 py-2 rounded cursor-pointer hover:bg-base-300 {$isSelected(opt.value) ? 'bg-base-300 border-l-2 border-primary' : ''}"
        >
          {opt.label}
        </div>
      {/each}
    {/if}
  </div>
{/if}
