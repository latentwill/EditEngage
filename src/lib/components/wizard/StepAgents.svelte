<script lang="ts">
  import { onMount } from 'svelte';
  import type { SelectedAgent, UserAgent } from '$lib/types/workflow';

  let {
    projectId,
    selectedAgents,
    onToggleAgent,
    onAgentsFetched,
    validationError
  }: {
    projectId: string;
    selectedAgents: SelectedAgent[];
    onToggleAgent: (agentId: string) => void;
    onAgentsFetched?: (agents: UserAgent[]) => void;
    validationError: string | null;
  } = $props();

  let agents = $state<UserAgent[]>([]);
  let loading = $state(true);

  let writingAgents = $derived(agents.filter((a) => a.type === 'writing'));
  let researchAgents = $derived(agents.filter((a) => a.type === 'research'));

  function isSelected(agentId: string): boolean {
    return selectedAgents.some((a) => a.id === agentId);
  }

  onMount(async () => {
    try {
      const response = await fetch(`/api/v1/writing-agents?project_id=${projectId}`);
      if (response.ok) {
        const result = await response.json();
        agents = result.data ?? [];
        onAgentsFetched?.(agents);
      }
    } catch {
      // fetch failed
    } finally {
      loading = false;
    }
  });
</script>

<div data-testid="step-agents">
  <h2 class="text-lg font-semibold text-base-content mb-4">Select agents</h2>

  {#if !loading && agents.length === 0}
    <div data-testid="agents-empty-state" class="text-center py-8 text-base-content/50">
      <p>No agents found. Please create an agent first.</p>
    </div>
  {/if}

  {#if writingAgents.length > 0}
    <div data-testid="agent-group-writing" class="mb-4">
      <h3 class="text-sm text-base-content/50 mb-2">Writing</h3>
      <div class="grid grid-cols-2 gap-3">
        {#each writingAgents as agent (agent.id)}
          <button
            type="button"
            data-testid="agent-card"
            onclick={() => onToggleAgent(agent.id)}
            class="card bg-base-200 card-compact p-3 border text-left transition-all {isSelected(agent.id)
              ? 'border-primary ring ring-primary/30 text-primary'
              : 'border-base-300 text-base-content/70 hover:border-base-content/20'}"
          >
            <span>{agent.name}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if researchAgents.length > 0}
    <div data-testid="agent-group-research" class="mb-4">
      <h3 class="text-sm text-base-content/50 mb-2">Research</h3>
      <div class="grid grid-cols-2 gap-3">
        {#each researchAgents as agent (agent.id)}
          <button
            type="button"
            data-testid="agent-card"
            onclick={() => onToggleAgent(agent.id)}
            class="card bg-base-200 card-compact p-3 border text-left transition-all {isSelected(agent.id)
              ? 'border-primary ring ring-primary/30 text-primary'
              : 'border-base-300 text-base-content/70 hover:border-base-content/20'}"
          >
            <span>{agent.name}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if selectedAgents.length > 0}
    <div data-testid="selected-agents-list" class="mt-4">
      <h3 class="text-sm text-base-content/50 mb-2">Selected agents</h3>
      {#each selectedAgents as agent (agent.id)}
        <div
          data-testid="selected-agent-item"
          class="flex items-center gap-2 p-2 mb-1 rounded bg-base-200 border border-base-300"
        >
          <span class="flex-1 text-base-content/80">{agent.name}</span>
        </div>
      {/each}
    </div>
  {/if}

  {#if validationError}
    <div data-testid="agents-validation-error" class="text-red-400 text-sm mt-2">
      {validationError}
    </div>
  {/if}
</div>
