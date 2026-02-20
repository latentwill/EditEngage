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
  }> } } = $props();

  let showForm = $state(false);
  let selectedType = $state<DestinationType>('ghost');
  let formName = $state('');
  let ghostApiUrl = $state('');
  let ghostAdminKey = $state('');
  let postbridgeApiKey = $state('');
  let postbridgeAccountId = $state('');
  let validationErrors = $state<string[]>([]);
  let testingId = $state<string | null>(null);
  let testResults = $state<Record<string, { status: 'healthy' | 'unhealthy'; message: string }>>({});

  function openForm() {
    showForm = true;
    validationErrors = [];
  }

  function validateGhost(): string[] {
    const errors: string[] = [];
    if (!formName.trim()) errors.push('Name is required');
    if (!ghostApiUrl.trim()) errors.push('API URL is required');
    if (!ghostAdminKey.trim()) errors.push('Admin key is required');
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
    if (selectedType === 'ghost') {
      validationErrors = validateGhost();
    } else if (selectedType === 'postbridge') {
      validationErrors = validatePostBridge();
    }

    if (validationErrors.length > 0) return;

    const config = selectedType === 'ghost'
      ? { api_url: ghostApiUrl, admin_key: ghostAdminKey }
      : { api_key: postbridgeApiKey, account_id: postbridgeAccountId };

    await fetch('/api/v1/destinations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: selectedType,
        name: formName,
        config
      })
    });

    showForm = false;
  }

  async function testConnection(destId: string) {
    testingId = destId;
    try {
      const res = await fetch(`/api/v1/destinations/${destId}/health`, {
        method: 'POST'
      });
      const result = await res.json();
      testResults[destId] = result;
    } catch {
      testResults[destId] = { status: 'unhealthy', message: 'Request failed' };
    }
    testingId = null;
  }
</script>

<div data-testid="destinations-page" class="space-y-6">
  <h1 class="text-2xl font-bold text-base-content">Destinations</h1>

  <div class="grid gap-4">
    {#each data.destinations as dest}
      <div data-testid="destination-card" class="card bg-base-200 shadow-xl p-6 flex flex-row items-center justify-between">
        <div class="flex items-center gap-4">
          <span class="text-base-content font-medium">{dest.name}</span>
          <span class="text-base-content/60 text-sm">{dest.type}</span>
          <span class={dest.is_active ? 'badge badge-success' : 'badge badge-ghost'}>{dest.is_active ? 'active' : 'inactive'}</span>
          {#if testResults[dest.id]}
            <span class={testResults[dest.id].status === 'healthy' ? 'badge badge-success' : 'badge badge-error'}>
              {testResults[dest.id].status === 'healthy' ? '✓ Connected' : '✗ ' + testResults[dest.id].message}
            </span>
          {/if}
        </div>
        <button class="btn btn-ghost" onclick={() => testConnection(dest.id)} disabled={testingId === dest.id}>
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
        <label class="block text-sm text-base-content/80 mb-1" for="dest-name">Name</label>
        <input id="dest-name" type="text" class="input input-bordered w-full" bind:value={formName} />

        <label class="block text-sm text-base-content/80 mb-1" for="ghost-api-url">API URL</label>
        <input id="ghost-api-url" type="text" class="input input-bordered w-full" bind:value={ghostApiUrl} />

        <label class="block text-sm text-base-content/80 mb-1" for="ghost-admin-key">Admin Key</label>
        <input id="ghost-admin-key" type="text" class="input input-bordered w-full" bind:value={ghostAdminKey} />
      {:else if selectedType === 'postbridge'}
        <label class="block text-sm text-base-content/80 mb-1" for="dest-name-pb">Name</label>
        <input id="dest-name-pb" type="text" class="input input-bordered w-full" bind:value={formName} />

        <label class="block text-sm text-base-content/80 mb-1" for="pb-api-key">API Key</label>
        <input id="pb-api-key" type="text" class="input input-bordered w-full" bind:value={postbridgeApiKey} />

        <label class="block text-sm text-base-content/80 mb-1" for="pb-account-id">Account ID</label>
        <input id="pb-account-id" type="text" class="input input-bordered w-full" bind:value={postbridgeAccountId} />
      {/if}

      {#each validationErrors as error}
        <p data-testid="validation-error" class="text-error text-sm">{error}</p>
      {/each}

      <div class="flex gap-2">
        <button type="submit" class="btn btn-primary">Save Destination</button>
        <button type="button" class="btn btn-ghost" onclick={() => { showForm = false; }}>Cancel</button>
      </div>
    </form>
  {/if}
</div>
