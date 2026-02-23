<script lang="ts">
  import type { DestinationType } from '$lib/types/database.js';

  let { data }: { data: { destinations: Array<{
    id: string;
    project_id: string;
    type: DestinationType;
    name: string;
    config: Record<string, unknown>;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }>; projectId: string } } = $props();

  let showForm = $state(false);
  let selectedType = $state<DestinationType>('ghost');
  let formName = $state('');
  let ghostApiUrl = $state('');
  let ghostKey = $state('');
  let ghostKeyType = $state<'admin' | 'content'>('admin');
  let postbridgeApiKey = $state('');
  let postbridgeAccountId = $state('');
  let validationErrors = $state<string[]>([]);
  let saveError = $state<string | null>(null);
  let testingId = $state<string | null>(null);

  function openForm() {
    showForm = true;
    validationErrors = [];
    saveError = null;
  }

  function validateGhost(): string[] {
    const errors: string[] = [];
    if (!formName.trim()) errors.push('Name is required');
    if (!ghostApiUrl.trim()) errors.push('Ghost Blog URL is required');
    if (!ghostKey.trim()) errors.push(`${ghostKeyType === 'admin' ? 'Admin' : 'Content'} API Key is required`);
    return errors;
  }

  function validatePostBridge(): string[] {
    const errors: string[] = [];
    if (!formName.trim()) errors.push('Name is required');
    if (!postbridgeApiKey.trim()) errors.push('API key is required');
    if (!postbridgeAccountId.trim()) errors.push('Account ID is required');
    return errors;
  }

  async function handleSave() {
    saveError = null;

    if (selectedType === 'ghost') {
      validationErrors = validateGhost();
    } else if (selectedType === 'postbridge') {
      validationErrors = validatePostBridge();
    }

    if (validationErrors.length > 0) return;

    const config = selectedType === 'ghost'
      ? { api_url: ghostApiUrl, key_type: ghostKeyType, key: ghostKey }
      : { api_key: postbridgeApiKey, account_id: postbridgeAccountId };

    const res = await fetch('/api/v1/destinations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: data.projectId,
        type: selectedType,
        name: formName,
        config
      })
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      saveError = (body as { error?: string }).error ?? `Failed to save destination (${res.status})`;
      return;
    }

    const { data: newDest } = await res.json();
    if (newDest) {
      data = { ...data, destinations: [newDest, ...data.destinations] };
    }
    showForm = false;
    formName = '';
    ghostApiUrl = '';
    ghostKey = '';
    ghostKeyType = 'admin';
    postbridgeApiKey = '';
    postbridgeAccountId = '';
  }

  async function testConnection(destId: string) {
    testingId = destId;
    await fetch(`/api/v1/destinations/${destId}/health`, {
      method: 'POST'
    });
    testingId = null;
  }
</script>

<div data-testid="destinations-page" class="space-y-6 py-6">
  <h1 class="text-2xl font-bold text-base-content">Destinations</h1>

  <div class="grid gap-4">
    {#each data.destinations as dest}
      <div data-testid="destination-card" class="card bg-base-200 shadow-xl p-6 flex flex-row items-center justify-between">
        <div class="flex items-center gap-4">
          <span class="text-base-content font-medium">{dest.name}</span>
          <span class="text-base-content/60 text-sm">{dest.type}</span>
          <span class={dest.is_active ? 'badge badge-success' : 'badge badge-ghost'}>{dest.is_active ? 'active' : 'inactive'}</span>
        </div>
        <button class="btn btn-ghost" onclick={() => testConnection(dest.id)}>
          {testingId === dest.id ? 'Testing…' : 'Test Connection'}
        </button>
      </div>
    {/each}
  </div>

  {#if !showForm}
    <button class="btn btn-ghost" onclick={openForm}>Add Destination</button>
  {/if}

  {#if showForm}
    <form class="card bg-base-200 shadow-xl p-6 space-y-4" onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
      <label class="block text-sm text-base-content/80 mb-1" for="dest-type">Destination Type</label>
      <select id="dest-type" class="select select-bordered w-full" bind:value={selectedType}>
        <option value="ghost">Ghost</option>
        <option value="postbridge">Post Bridge</option>
        <option value="webhook">Webhook</option>
      </select>

      {#if selectedType === 'ghost'}
        <div class="flex items-center gap-2 py-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-6 h-6 fill-base-content/70" aria-hidden="true">
            <path d="M12 2C7.03 2 3 6.03 3 11v7a2 2 0 0 0 2 2h1v-6H5v-3a7 7 0 0 1 14 0v3h-1v6h1a2 2 0 0 0 2-2v-7c0-4.97-4.03-9-9-9zm-2 15a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
          </svg>
          <span class="font-semibold text-base-content">Ghost</span>
        </div>

        <div>
          <label class="block text-sm text-base-content/80 mb-1" for="dest-name">Name</label>
          <input id="dest-name" type="text" class="input input-bordered w-full" bind:value={formName} placeholder="My Ghost Blog" />
        </div>

        <div>
          <label class="block text-sm text-base-content/80 mb-1" for="ghost-api-url">Ghost Blog URL</label>
          <input id="ghost-api-url" type="url" class="input input-bordered w-full" bind:value={ghostApiUrl} placeholder="https://yourdomain.com" />
          <p class="text-xs text-base-content/50 mt-1">The root URL of your Ghost site, e.g. https://yourdomain.com</p>
        </div>

        <div>
          <p class="block text-sm text-base-content/80 mb-2">Key Type</p>
          <div class="flex gap-2 mb-3">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" class="radio radio-sm" name="ghost-key-type" value="admin" bind:group={ghostKeyType} />
              <span class="text-sm">Admin Key</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" class="radio radio-sm" name="ghost-key-type" value="content" bind:group={ghostKeyType} />
              <span class="text-sm">Content Key</span>
            </label>
          </div>

          <label class="block text-sm text-base-content/80 mb-1" for="ghost-key">
            {ghostKeyType === 'admin' ? 'Admin API Key' : 'Content API Key'}
          </label>
          <input id="ghost-key" type="text" class="input input-bordered w-full font-mono text-sm" bind:value={ghostKey} placeholder={ghostKeyType === 'admin' ? 'your-admin-key' : 'your-content-key'} />
          <p class="text-xs text-base-content/50 mt-1">
            {#if ghostKeyType === 'admin'}
              Found in Ghost Admin → Integrations → Custom Integration → Admin API Key
            {:else}
              Found in Ghost Admin → Integrations → Custom Integration → Content API Key
            {/if}
          </p>
        </div>

      {:else if selectedType === 'postbridge'}
        <div>
          <label class="block text-sm text-base-content/80 mb-1" for="dest-name-pb">Name</label>
          <input id="dest-name-pb" type="text" class="input input-bordered w-full" bind:value={formName} />
        </div>

        <div>
          <label class="block text-sm text-base-content/80 mb-1" for="pb-api-key">API Key</label>
          <input id="pb-api-key" type="text" class="input input-bordered w-full" bind:value={postbridgeApiKey} />
        </div>

        <div>
          <label class="block text-sm text-base-content/80 mb-1" for="pb-account-id">Account ID</label>
          <input id="pb-account-id" type="text" class="input input-bordered w-full" bind:value={postbridgeAccountId} />
        </div>
      {/if}

      {#each validationErrors as error}
        <p data-testid="validation-error" class="text-error text-sm">{error}</p>
      {/each}

      {#if saveError}
        <p data-testid="save-error" class="text-error text-sm">{saveError}</p>
      {/if}

      <div class="flex gap-2">
        <button type="submit" class="btn btn-primary">Save Destination</button>
        <button type="button" class="btn btn-ghost" onclick={() => { showForm = false; }}>Cancel</button>
      </div>
    </form>
  {/if}
</div>
