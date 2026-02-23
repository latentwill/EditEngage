<script lang="ts">
  let {
    availableProviders,
    chain,
    onChainChange
  }: {
    availableProviders: Array<{ provider: string; name: string }>;
    chain: Array<{ provider: string; role: string }>;
    onChainChange: (chain: Array<{ provider: string; role: string }>) => void;
  } = $props();

  function addProvider(): void {
    // Add the first available provider not already in chain, or first provider
    const existing = new Set(chain.map((c) => c.provider));
    const next = availableProviders.find((p) => !existing.has(p.provider)) ?? availableProviders[0];
    if (next) {
      onChainChange([...chain, { provider: next.provider, role: 'discovery' }]);
    }
  }

  function removeProvider(index: number): void {
    const updated = chain.filter((_, i) => i !== index);
    onChainChange(updated);
  }

  function updateRole(index: number, role: string): void {
    const updated = chain.map((item, i) => (i === index ? { ...item, role } : item));
    onChainChange(updated);
  }

  function getProviderName(providerId: string): string {
    return availableProviders.find((p) => p.provider === providerId)?.name ?? providerId;
  }
</script>

<div data-testid="provider-chain-builder" class="space-y-4">
  <div class="flex flex-wrap gap-2">
    {#each availableProviders as ap}
      <span class="badge badge-outline">{ap.name}</span>
    {/each}
  </div>

  {#each chain as item, index}
    <div data-testid="chain-provider-{index}" class="flex items-center gap-2 p-2 bg-base-200 rounded-lg">
      <span class="font-medium">{getProviderName(item.provider)}</span>
      <select
        data-testid="chain-role-select-{index}"
        class="select select-bordered select-sm"
        value={item.role}
        onchange={(e) => updateRole(index, (e.target as HTMLSelectElement).value)}
      >
        <option value="discovery">Discovery</option>
        <option value="analysis">Analysis</option>
        <option value="citation">Citation</option>
      </select>
      <button
        class="btn btn-ghost btn-xs"
        onclick={() => removeProvider(index)}
      >
        Remove
      </button>
    </div>
  {/each}

  <button
    data-testid="chain-add-provider"
    class="btn btn-outline btn-sm"
    onclick={addProvider}
    disabled={chain.length >= availableProviders.length}
  >
    + Add Provider
  </button>
</div>
