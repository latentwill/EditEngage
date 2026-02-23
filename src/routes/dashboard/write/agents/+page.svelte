<script lang="ts">
  import type { Database } from '$lib/types/database.js';
  type WritingAgent = Database['public']['Tables']['writing_agents']['Row'];

  let { data }: { data: { writingAgents: WritingAgent[] } } = $props();

  const AVAILABLE_MODELS = [
    { value: 'anthropic/claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { value: 'anthropic/claude-opus-4-6', label: 'Claude Opus 4.6' },
    { value: 'anthropic/claude-haiku-4-5', label: 'Claude Haiku 4.5' },
    { value: 'openai/gpt-4o', label: 'GPT-4o' },
    { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'google/gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
  ];

  const MODEL_LABEL_MAP = new Map(AVAILABLE_MODELS.map((m) => [m.value, m.label]));

  function modelLabel(modelValue: string): string {
    return MODEL_LABEL_MAP.get(modelValue) ?? modelValue;
  }

  let localAgents = $state<WritingAgent[]>(data.writingAgents);
  let showForm = $state(false);
  let agentName = $state('');
  let agentDescription = $state('');
  let agentModel = $state('anthropic/claude-sonnet-4-6');
  let agentSystemPrompt = $state('');
  let saving = $state(false);
  let errors = $state<string[]>([]);
  let toggleError = $state<string | null>(null);
  let togglingId = $state<string | null>(null);

  function openForm() {
    showForm = true;
    errors = [];
  }

  function closeForm() {
    showForm = false;
    agentName = '';
    agentDescription = '';
    agentModel = 'anthropic/claude-sonnet-4-6';
    agentSystemPrompt = '';
    errors = [];
  }

  async function handleSave() {
    errors = [];
    if (!agentName.trim()) {
      errors = ['Name is required'];
      return;
    }

    saving = true;
    try {
      const res = await fetch('/api/v1/writing-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agentName,
          description: agentDescription,
          model: agentModel,
          system_prompt: agentSystemPrompt,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        localAgents = [result.data, ...localAgents];
        closeForm();
      } else {
        const result = await res.json();
        errors = [result.error ?? 'Failed to save agent'];
      }
    } finally {
      saving = false;
    }
  }

  async function toggleActive(agent: WritingAgent) {
    if (togglingId) return;
    togglingId = agent.id;
    toggleError = null;
    try {
      const res = await fetch(`/api/v1/writing-agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !agent.is_active }),
      });

      if (res.ok) {
        const result = await res.json();
        localAgents = localAgents.map((a) =>
          a.id === agent.id ? result.data : a
        );
      } else {
        const result = await res.json();
        toggleError = result.error ?? 'Failed to update agent';
      }
    } catch {
      toggleError = 'Request failed';
    } finally {
      togglingId = null;
    }
  }
</script>

<div data-testid="agents-page" class="space-y-6 py-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-base-content">Agents</h1>
    {#if !showForm}
      <button class="btn btn-primary btn-sm" onclick={openForm}>Add Agent</button>
    {/if}
  </div>

  <p class="text-sm text-base-content/60">
    Writing agents are AI personas with a defined voice, model, and instructions. Select one or more when generating content.
  </p>

  {#if toggleError}
    <p class="text-error text-sm">{toggleError}</p>
  {/if}

  <!-- Agent Cards -->
  <div class="grid gap-4">
    {#each localAgents as agent}
      <div
        data-testid="agent-card"
        class="card bg-base-200 shadow-xl p-6"
        class:opacity-50={!agent.is_active}
      >
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-3">
              <span class="font-semibold text-base-content">{agent.name}</span>
              <span class="badge badge-ghost badge-sm">{modelLabel(agent.model)}</span>
              {#if agent.is_active}
                <span class="badge badge-success badge-sm">active</span>
              {:else}
                <span class="badge badge-ghost badge-sm">inactive</span>
              {/if}
            </div>
            {#if agent.description}
              <p class="text-sm text-base-content/60">{agent.description}</p>
            {/if}
            {#if agent.system_prompt}
              <p class="text-xs text-base-content/40 italic line-clamp-2">"{agent.system_prompt}"</p>
            {/if}
          </div>
          <button
            class="btn btn-ghost btn-sm flex-shrink-0"
            onclick={() => toggleActive(agent)}
            disabled={togglingId !== null}
          >
            {togglingId === agent.id ? '…' : agent.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    {/each}

    {#if localAgents.length === 0 && !showForm}
      <div class="py-12 text-center text-sm text-base-content/40">
        No agents yet. Add one to get started.
      </div>
    {/if}
  </div>

  <!-- Create Form -->
  {#if showForm}
    <form
      class="card bg-base-200 shadow-xl p-6 space-y-4"
      onsubmit={(e) => { e.preventDefault(); handleSave(); }}
    >
      <h2 class="text-lg font-semibold text-base-content">New Agent</h2>

      <div>
        <label class="block text-sm text-base-content/80 mb-1" for="agent-name">Name</label>
        <input
          id="agent-name"
          type="text"
          class="input input-bordered w-full"
          placeholder="e.g. The Analyst"
          bind:value={agentName}
        />
      </div>

      <div>
        <label class="block text-sm text-base-content/80 mb-1" for="agent-description">Description <span class="text-base-content/40">(optional)</span></label>
        <input
          id="agent-description"
          type="text"
          class="input input-bordered w-full"
          placeholder="Brief description of this agent's style"
          bind:value={agentDescription}
        />
      </div>

      <div>
        <label class="block text-sm text-base-content/80 mb-1" for="agent-model">Model</label>
        <select id="agent-model" class="select select-bordered w-full" bind:value={agentModel}>
          {#each AVAILABLE_MODELS as m}
            <option value={m.value}>{m.label}</option>
          {/each}
        </select>
      </div>

      <div>
        <label class="block text-sm text-base-content/80 mb-1" for="agent-system-prompt">
          System Prompt <span class="text-base-content/40">(optional)</span>
        </label>
        <textarea
          id="agent-system-prompt"
          class="textarea textarea-bordered w-full resize-none"
          rows="5"
          placeholder="You are an expert writer who specialises in..."
          bind:value={agentSystemPrompt}
        ></textarea>
      </div>

      {#each errors as error}
        <p data-testid="agent-error" class="text-error text-sm">{error}</p>
      {/each}

      <div class="flex gap-2">
        <button type="submit" class="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Agent'}
        </button>
        <button type="button" class="btn btn-ghost" onclick={closeForm}>Cancel</button>
      </div>
    </form>
  {/if}
</div>
