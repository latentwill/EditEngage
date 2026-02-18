<script lang="ts">
  import type { DestinationType } from '$lib/types/database';

  type DestinationOption = {
    type: DestinationType;
    label: string;
  };

  let {
    destinations,
    selectedDestination,
    onSelectDestination
  }: {
    destinations: DestinationOption[];
    selectedDestination: DestinationType | null;
    onSelectDestination: (type: DestinationType) => void;
  } = $props();
</script>

<div data-testid="step-destination">
  <h2 class="text-lg font-semibold text-base-content mb-4">Choose destination</h2>

  <div class="grid grid-cols-2 gap-3">
    {#each destinations as dest (dest.type)}
      <button
        type="button"
        data-testid="destination-option"
        onclick={() => onSelectDestination(dest.type)}
        class="card bg-base-200 card-compact p-4 border text-left transition-all {selectedDestination === dest.type
          ? 'border-primary ring ring-primary/30 text-primary'
          : 'border-base-300 text-base-content/70 hover:border-base-content/20'}"
      >
        <span data-testid="destination-option-{dest.type}">{dest.label}</span>
      </button>
    {/each}
  </div>
</div>
