<script lang="ts">
  import type { DestinationType, ApiProvider } from '$lib/types/database.js';

  type ApiKeyRow = {
    id: string;
    project_id: string;
    provider: ApiProvider;
    api_key: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };

  type DestinationRow = {
    id: string;
    project_id: string;
    type: DestinationType;
    name: string;
    config: Record<string, unknown>;
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

  let { data }: { data: { projectId: string; apiKeys: ApiKeyRow[]; destinations: DestinationRow[] } } = $props();

  // API Keys state
  let keyValues = $state<Record<string, string>>(
    Object.fromEntries(data.apiKeys.map(k => [k.provider, k.api_key]))
  );
  let keySaving = $state<Record<string, boolean>>({});

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

  // Destination state
  let showDestForm = $state(false);
  let selectedType = $state<DestinationType>('ghost');
  let destName = $state('');
  let ghostApiUrl = $state('');
  let ghostAdminKey = $state('');
  let postbridgeApiKey = $state('');
  let postbridgeAccountId = $state('');
  let webhookUrl = $state('');
  let validationErrors = $state<string[]>([]);
  let keySaveError = $state<Record<string, string>>({});

  function openDestForm() {
    showDestForm = true;
    validationErrors = [];
  }

  function validateGhost(): string[] {
    const errors: string[] = [];
    if (!destName.trim()) errors.push('Name is required');
    if (!ghostApiUrl.trim()) errors.push('API URL is required');
    if (!ghostAdminKey.trim()) errors.push('Admin key is required');
    return errors;
  }

  function validatePostBridge(): string[] {
    const errors: string[] = [];
    if (!destName.trim()) errors.push('Name is required');
    if (!postbridgeApiKey.trim()) errors.push('API key is required');
    if (!postbridgeAccountId.trim()) errors.push('Account ID is required');
    return errors;
  }

  function validateWebhook(): string[] {
    const errors: string[] = [];
    if (!destName.trim()) errors.push('Name is required');
    if (!webhookUrl.trim()) errors.push('Webhook URL is required');
    return errors;
  }

  function buildConfig(): Record<string, unknown> {
    if (selectedType === 'ghost') {
      return { api_url: ghostApiUrl, admin_key: ghostAdminKey };
    } else if (selectedType === 'postbridge') {
      return { api_key: postbridgeApiKey, account_id: postbridgeAccountId };
    } else {
      return { url: webhookUrl };
    }
  }

  async function handleSaveDest() {
    if (selectedType === 'ghost') {
      validationErrors = validateGhost();
    } else if (selectedType === 'postbridge') {
      validationErrors = validatePostBridge();
    } else if (selectedType === 'webhook') {
      validationErrors = validateWebhook();
    }

    if (validationErrors.length > 0) return;

    await fetch('/api/v1/destinations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: data.projectId,
        type: selectedType,
        name: destName,
        config: buildConfig()
      })
    });

    showDestForm = false;
  }
</script>

<div data-testid="integrations-page" class="space-y-8">
  <h1 class="text-2xl font-bold text-white">Integrations</h1>

  <!-- AI Providers Section -->
  <section data-testid="ai-providers-section">
    <h2 class="text-lg font-semibold text-white/80 mb-4">AI Providers</h2>
    <div class="space-y-3">
      {#each providers as provider}
        <div class="backdrop-blur-[20px] bg-[var(--glass-bg,rgba(255,255,255,0.08))] border border-[var(--glass-border,rgba(255,255,255,0.08))] rounded-xl p-4 flex items-center gap-4">
          <span class="text-white font-medium w-28">{provider.label}</span>
          <input
            data-testid="api-key-input-{provider.id}"
            type="password"
            class="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm"
            placeholder="Enter API key..."
            value={keyValues[provider.id] ?? ''}
            oninput={(e) => { keyValues[provider.id] = (e.target as HTMLInputElement).value; }}
          />
          <button
            data-testid="api-key-save-{provider.id}"
            class="px-4 py-2 bg-[var(--accent)] text-black rounded-lg text-sm font-medium hover:opacity-90"
            onclick={() => saveKey(provider.id)}
            disabled={keySaving[provider.id]}
          >
            {keySaving[provider.id] ? 'Saving...' : 'Save'}
          </button>
        </div>
        {#if keySaveError[provider.id]}
          <p data-testid="api-key-error-{provider.id}" class="text-red-400 text-sm mt-1">{keySaveError[provider.id]}</p>
        {/if}
      {/each}
    </div>
  </section>

  <!-- Publishing Destinations Section -->
  <section data-testid="destinations-section">
    <h2 class="text-lg font-semibold text-white/80 mb-4">Publishing Destinations</h2>

    {#each data.destinations as dest}
      <div data-testid="destination-card" class="backdrop-blur-[20px] bg-[var(--glass-bg,rgba(255,255,255,0.08))] border border-[var(--glass-border,rgba(255,255,255,0.08))] rounded-xl p-4 mb-3">
        <span class="text-white font-medium">{dest.name}</span>
        <span class="text-white/60 ml-3 text-sm">{dest.type}</span>
        <span class="ml-3 text-sm {dest.is_active ? 'text-emerald-400' : 'text-white/40'}">{dest.is_active ? 'active' : 'inactive'}</span>
      </div>
    {/each}

    {#if !showDestForm}
      <button
        class="px-4 py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg text-white/80 text-sm hover:bg-white/[0.12]"
        onclick={openDestForm}
      >
        Add Destination
      </button>
    {/if}

    {#if showDestForm}
      <form
        class="backdrop-blur-[20px] bg-[var(--glass-bg,rgba(255,255,255,0.08))] border border-[var(--glass-border,rgba(255,255,255,0.08))] rounded-xl p-4 space-y-3"
        onsubmit={(e) => { e.preventDefault(); handleSaveDest(); }}
      >
        <label for="dest-type" class="block text-white/80 text-sm">Destination Type</label>
        <select id="dest-type" bind:value={selectedType} class="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm">
          <option value="ghost">Ghost</option>
          <option value="postbridge">Post Bridge</option>
          <option value="webhook">Webhook</option>
        </select>

        {#if selectedType === 'ghost'}
          <label for="dest-name">Name</label>
          <input id="dest-name" type="text" bind:value={destName} class="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm" />

          <label for="ghost-api-url">API URL</label>
          <input id="ghost-api-url" type="text" bind:value={ghostApiUrl} class="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm" />

          <label for="ghost-admin-key">Admin Key</label>
          <input id="ghost-admin-key" type="password" bind:value={ghostAdminKey} class="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm" />
        {:else if selectedType === 'postbridge'}
          <label for="dest-name-pb">Name</label>
          <input id="dest-name-pb" type="text" bind:value={destName} class="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm" />

          <label for="pb-api-key">API Key</label>
          <input id="pb-api-key" type="password" bind:value={postbridgeApiKey} class="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm" />

          <label for="pb-account-id">Account ID</label>
          <input id="pb-account-id" type="text" bind:value={postbridgeAccountId} class="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm" />
        {:else if selectedType === 'webhook'}
          <label for="dest-name-wh">Name</label>
          <input id="dest-name-wh" type="text" bind:value={destName} class="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm" />

          <label for="webhook-url">Webhook URL</label>
          <input id="webhook-url" type="url" bind:value={webhookUrl} class="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm" />
        {/if}

        {#each validationErrors as error}
          <p data-testid="validation-error" class="text-red-400 text-sm">{error}</p>
        {/each}

        <button type="submit" class="px-4 py-2 bg-[var(--accent)] text-black rounded-lg text-sm font-medium hover:opacity-90">
          Save Destination
        </button>
      </form>
    {/if}
  </section>
</div>
