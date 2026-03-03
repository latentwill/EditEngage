<script lang="ts">
  import type { Database } from '$lib/types/database.js';
  type WritingAgent = Database['public']['Tables']['writing_agents']['Row'];

  let { data }: { data: { agent: WritingAgent | null; projectId: string } } = $props();

  const AVAILABLE_MODELS = [
    { value: 'anthropic/claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { value: 'anthropic/claude-opus-4-6', label: 'Claude Opus 4.6' },
    { value: 'anthropic/claude-haiku-4-5', label: 'Claude Haiku 4.5' },
    { value: 'openai/gpt-4o', label: 'GPT-4o' },
    { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'google/gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
  ];

  let name = $state(data.agent?.name ?? '');
  let description = $state(data.agent?.description ?? '');
  let model = $state(data.agent?.model ?? 'anthropic/claude-sonnet-4-6');
  let systemPrompt = $state(data.agent?.system_prompt ?? '');
  let isActive = $state(data.agent?.is_active ?? true);
  let saving = $state(false);
  let saveSuccess = $state(false);
  let saveError = $state('');

  async function handleSave() {
    if (!data.agent) return;
    saving = true;
    saveError = '';
    saveSuccess = false;

    try {
      const res = await fetch(`/api/v1/writing-agents/${data.agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          model,
          system_prompt: systemPrompt,
          is_active: isActive,
        }),
      });

      if (res.ok) {
        saveSuccess = true;
        setTimeout(() => { saveSuccess = false; }, 2000);
      } else {
        const result = await res.json();
        saveError = result.error ?? 'Failed to update agent';
      }
    } catch {
      saveError = 'Network error';
    } finally {
      saving = false;
    }
  }
</script>

<div data-testid="agent-edit-page" class="space-y-6 py-6">
  <div class="flex items-center gap-4">
    <a href="/dashboard/write/agents" class="btn btn-ghost btn-sm" aria-label="Back">Back</a>
    <h1 class="text-2xl font-bold text-base-content">Edit Agent</h1>
  </div>

  {#if !data.agent}
    <div class="py-12 text-center">
      <p class="text-base-content/60">Agent not found.</p>
    </div>
  {:else}
    <form
      class="card bg-base-200 shadow-xl p-6 space-y-4"
      onsubmit={(e) => { e.preventDefault(); handleSave(); }}
    >
      <div>
        <label class="block text-sm text-base-content/80 mb-1" for="edit-agent-name">Name</label>
        <input
          id="edit-agent-name"
          type="text"
          class="input input-bordered w-full"
          bind:value={name}
        />
      </div>

      <div>
        <label class="block text-sm text-base-content/80 mb-1" for="edit-agent-description">Description</label>
        <input
          id="edit-agent-description"
          type="text"
          class="input input-bordered w-full"
          bind:value={description}
        />
      </div>

      <div>
        <label class="block text-sm text-base-content/80 mb-1" for="edit-agent-model">Model</label>
        <select id="edit-agent-model" class="select select-bordered w-full" bind:value={model}>
          {#each AVAILABLE_MODELS as m}
            <option value={m.value}>{m.label}</option>
          {/each}
        </select>
      </div>

      <div>
        <label class="block text-sm text-base-content/80 mb-1" for="edit-agent-system-prompt">System Prompt</label>
        <textarea
          id="edit-agent-system-prompt"
          class="textarea textarea-bordered w-full resize-none"
          rows="5"
          bind:value={systemPrompt}
        ></textarea>
      </div>

      <div class="flex items-center gap-2">
        <input
          id="edit-agent-active"
          type="checkbox"
          class="toggle toggle-primary"
          bind:checked={isActive}
        />
        <label for="edit-agent-active" class="text-sm text-base-content/80">Active</label>
      </div>

      {#if saveError}
        <p class="text-error text-sm">{saveError}</p>
      {/if}

      {#if saveSuccess}
        <p class="text-success text-sm">Saved!</p>
      {/if}

      <div class="flex gap-2">
        <button type="submit" class="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <a href="/dashboard/write/agents" class="btn btn-ghost">Cancel</a>
      </div>
    </form>
  {/if}
</div>
