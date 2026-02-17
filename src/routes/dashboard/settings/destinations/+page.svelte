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

<div data-testid="destinations-page" class="space-y-6">
  <h1 class="text-2xl font-bold text-white">Destinations</h1>

  <div class="grid gap-4">
    {#each data.destinations as dest}
      <div data-testid="destination-card" class="backdrop-blur-[20px] bg-white/[0.08] border border-white/[0.12] rounded-xl p-6 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <span class="text-white font-medium">{dest.name}</span>
          <span class="text-white/60 text-sm">{dest.type}</span>
          <span class={dest.is_active ? 'text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400' : 'text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40'}>{dest.is_active ? 'active' : 'inactive'}</span>
        </div>
        <button class="bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white/80 hover:text-white px-4 py-2 rounded-lg transition-all duration-300 text-sm" onclick={() => testConnection(dest.id)}>Test Connection</button>
      </div>
    {/each}
  </div>

  {#if !showForm}
    <button class="bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white/80 hover:text-white px-6 py-3 rounded-lg transition-all duration-300" onclick={openForm}>Add Destination</button>
  {/if}

  {#if showForm}
    <form class="backdrop-blur-[20px] bg-white/[0.08] border border-white/[0.12] rounded-xl p-6 space-y-4" onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
      <label class="block text-sm text-white/80 mb-1" for="dest-type">Destination Type</label>
      <select id="dest-type" class="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all duration-300" bind:value={selectedType}>
        <option value="ghost">Ghost</option>
        <option value="postbridge">Post Bridge</option>
        <option value="webhook">Webhook</option>
      </select>

      {#if selectedType === 'ghost'}
        <label class="block text-sm text-white/80 mb-1" for="dest-name">Name</label>
        <input id="dest-name" type="text" class="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all duration-300" bind:value={formName} />

        <label class="block text-sm text-white/80 mb-1" for="ghost-api-url">API URL</label>
        <input id="ghost-api-url" type="text" class="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all duration-300" bind:value={ghostApiUrl} />

        <label class="block text-sm text-white/80 mb-1" for="ghost-admin-key">Admin Key</label>
        <input id="ghost-admin-key" type="text" class="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all duration-300" bind:value={ghostAdminKey} />
      {:else if selectedType === 'postbridge'}
        <label class="block text-sm text-white/80 mb-1" for="dest-name-pb">Name</label>
        <input id="dest-name-pb" type="text" class="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all duration-300" bind:value={formName} />

        <label class="block text-sm text-white/80 mb-1" for="pb-api-key">API Key</label>
        <input id="pb-api-key" type="text" class="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all duration-300" bind:value={postbridgeApiKey} />

        <label class="block text-sm text-white/80 mb-1" for="pb-account-id">Account ID</label>
        <input id="pb-account-id" type="text" class="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all duration-300" bind:value={postbridgeAccountId} />
      {/if}

      {#each validationErrors as error}
        <p data-testid="validation-error" class="text-red-400 text-sm">{error}</p>
      {/each}

      <button type="submit" class="bg-emerald-500 hover:bg-emerald-400 text-white font-medium px-6 py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25">Save Destination</button>
    </form>
  {/if}
</div>
