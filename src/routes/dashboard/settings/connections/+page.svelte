<script lang="ts">
  import type { ApiProvider } from '$lib/types/database.js';

  type ApiKeyRow = {
    id: string;
    project_id: string;
    provider: ApiProvider;
    api_key: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };

  const providers: { id: ApiProvider; label: string }[] = [
    { id: 'openrouter', label: 'OpenRouter' },
    { id: 'perplexity', label: 'Perplexity' },
    { id: 'tavily', label: 'Tavily' },
    { id: 'openai', label: 'OpenAI' },
    { id: 'serpapi', label: 'SerpAPI' }
  ];

  let { data }: { data: { projectId: string; apiKeys: ApiKeyRow[] } } = $props();

  let keyValues = $state<Record<string, string>>(
    Object.fromEntries(data.apiKeys.map(k => [k.provider, k.api_key]))
  );
  let keySaving = $state<Record<string, boolean>>({});
  let keySaveError = $state<Record<string, string>>({});

  async function saveKey(provider: ApiProvider) {
    keySaving[provider] = true;
    keySaveError[provider] = '';
    try {
      const res = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: data.projectId,
          provider,
          api_key: keyValues[provider]
        })
      });
      if (!res.ok) {
        const body = await res.json();
        keySaveError[provider] = body.error || 'Failed to save';
      }
    } catch {
      keySaveError[provider] = 'Network error';
    }
    keySaving[provider] = false;
  }
</script>

<div data-testid="connections-page" class="space-y-8">
  <h1 class="text-2xl font-bold text-base-content">Connections</h1>

  <!-- AI Providers Section -->
  <section data-testid="ai-providers-section">
    <h2 class="text-lg font-semibold text-base-content/80 mb-4">AI Providers</h2>
    <div class="space-y-3">
      {#each providers as provider}
        <div class="card bg-base-200 shadow-xl p-4 flex flex-row items-center gap-4">
          <span class="text-base-content font-medium w-28">{provider.label}</span>
          <input
            data-testid="api-key-input-{provider.id}"
            type="password"
            class="input input-bordered flex-1"
            placeholder="Enter API key..."
            value={keyValues[provider.id] ?? ''}
            oninput={(e) => { keyValues[provider.id] = (e.target as HTMLInputElement).value; }}
          />
          <button
            data-testid="api-key-save-{provider.id}"
            class="btn btn-primary btn-sm"
            onclick={() => saveKey(provider.id)}
            disabled={keySaving[provider.id]}
          >
            {keySaving[provider.id] ? 'Saving...' : 'Save'}
          </button>
        </div>
        {#if keySaveError[provider.id]}
          <p data-testid="api-key-error-{provider.id}" class="text-error text-sm mt-1">{keySaveError[provider.id]}</p>
        {/if}
      {/each}
    </div>
  </section>
</div>
