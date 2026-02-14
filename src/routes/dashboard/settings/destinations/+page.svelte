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
    await fetch(`/api/v1/destinations/${destId}/health`, {
      method: 'POST'
    });
    testingId = null;
  }
</script>

<div data-testid="destinations-page">
  <h1>Destinations</h1>

  {#each data.destinations as dest}
    <div data-testid="destination-card">
      <span>{dest.name}</span>
      <span>{dest.type}</span>
      <span>{dest.is_active ? 'active' : 'inactive'}</span>
      <button onclick={() => testConnection(dest.id)}>Test Connection</button>
    </div>
  {/each}

  {#if !showForm}
    <button onclick={openForm}>Add Destination</button>
  {/if}

  {#if showForm}
    <form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
      <label for="dest-type">Destination Type</label>
      <select id="dest-type" bind:value={selectedType}>
        <option value="ghost">Ghost</option>
        <option value="postbridge">Post Bridge</option>
        <option value="webhook">Webhook</option>
      </select>

      {#if selectedType === 'ghost'}
        <label for="dest-name">Name</label>
        <input id="dest-name" type="text" bind:value={formName} />

        <label for="ghost-api-url">API URL</label>
        <input id="ghost-api-url" type="text" bind:value={ghostApiUrl} />

        <label for="ghost-admin-key">Admin Key</label>
        <input id="ghost-admin-key" type="text" bind:value={ghostAdminKey} />
      {:else if selectedType === 'postbridge'}
        <label for="dest-name-pb">Name</label>
        <input id="dest-name-pb" type="text" bind:value={formName} />

        <label for="pb-api-key">API Key</label>
        <input id="pb-api-key" type="text" bind:value={postbridgeApiKey} />

        <label for="pb-account-id">Account ID</label>
        <input id="pb-account-id" type="text" bind:value={postbridgeAccountId} />
      {/if}

      {#each validationErrors as error}
        <p data-testid="validation-error">{error}</p>
      {/each}

      <button type="submit">Save Destination</button>
    </form>
  {/if}
</div>
