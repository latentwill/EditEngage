<script lang="ts">
  type Provider = {
    id: string;
    provider: string;
    name: string;
    api_key: string;
    is_active: boolean;
  };

  let {
    providers,
    onSave,
    onToggle,
    onTest
  }: {
    providers: Provider[];
    onSave: (provider: string, apiKey: string) => void;
    onToggle: (providerId: string, isActive: boolean) => void;
    onTest: (provider: string) => Promise<boolean>;
  } = $props();

  let keyValues: Record<string, string> = $state({});
  let testStatus: Record<string, 'success' | 'error' | null> = $state({});

  function getKeyValue(provider: string): string {
    return keyValues[provider] ?? '';
  }

  function handleInput(provider: string, event: Event) {
    const target = event.target as HTMLInputElement;
    keyValues[provider] = target.value;
  }

  function handleSave(provider: string) {
    onSave(provider, getKeyValue(provider));
  }

  async function handleTest(provider: string) {
    const result = await onTest(provider);
    testStatus[provider] = result ? 'success' : 'error';
  }

  function handleToggle(providerId: string, currentActive: boolean) {
    onToggle(providerId, !currentActive);
  }
</script>

<div data-testid="provider-settings" class="space-y-4">
  {#each providers as provider (provider.id)}
    <div data-testid={`provider-row-${provider.provider}`} class="card bg-base-200 p-4">
      <div class="flex items-center justify-between gap-4">
        <span class="font-medium text-sm">{provider.name}</span>

        <div class="flex items-center gap-2 flex-1">
          <input
            data-testid={`provider-key-input-${provider.provider}`}
            type="password"
            class="input input-bordered input-sm flex-1"
            placeholder="API Key"
            value={getKeyValue(provider.provider)}
            oninput={(e) => handleInput(provider.provider, e)}
          />
        </div>

        <button
          data-testid={`provider-test-btn-${provider.provider}`}
          class="btn btn-sm btn-outline"
          onclick={() => handleTest(provider.provider)}
        >
          Test Connection
        </button>

        <button
          data-testid={`provider-save-btn-${provider.provider}`}
          class="btn btn-sm btn-primary"
          onclick={() => handleSave(provider.provider)}
        >
          Save
        </button>

        <input
          data-testid={`provider-toggle-${provider.provider}`}
          type="checkbox"
          class="toggle toggle-primary"
          checked={provider.is_active}
          onchange={() => handleToggle(provider.id, provider.is_active)}
        />

        {#if testStatus[provider.provider] === 'success'}
          <span data-testid={`provider-test-status-${provider.provider}`} class="badge badge-success text-xs">Success</span>
        {:else if testStatus[provider.provider] === 'error'}
          <span data-testid={`provider-test-status-${provider.provider}`} class="badge badge-error text-xs">Error</span>
        {/if}
      </div>
    </div>
  {/each}
</div>
