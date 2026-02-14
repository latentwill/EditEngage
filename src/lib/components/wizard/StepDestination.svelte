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
  <h2 class="text-lg font-semibold text-white mb-4">Choose destination</h2>

  <div class="grid grid-cols-2 gap-3">
    {#each destinations as dest (dest.type)}
      <button
        type="button"
        data-testid="destination-option"
        onclick={() => onSelectDestination(dest.type)}
        class="p-4 rounded-lg border text-left transition-all {selectedDestination === dest.type
          ? 'bg-blue-500/20 border-blue-400/40 text-blue-300'
          : 'bg-white/5 border-white/10 text-white/70 hover:border-white/20'}"
      >
        <span data-testid="destination-option-{dest.type}">{dest.label}</span>
      </button>
    {/each}
  </div>
</div>
