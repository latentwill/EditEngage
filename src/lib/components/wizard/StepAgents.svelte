<script lang="ts">
  type AgentOption = {
    type: string;
    label: string;
  };

  let {
    availableAgents,
    selectedAgents,
    onToggleAgent,
    onMoveAgent,
    validationError
  }: {
    availableAgents: AgentOption[];
    selectedAgents: AgentOption[];
    onToggleAgent: (agentType: string) => void;
    onMoveAgent: (index: number, direction: 'up' | 'down') => void;
    validationError: string | null;
  } = $props();

  function isSelected(agentType: string): boolean {
    return selectedAgents.some((a) => a.type === agentType);
  }
</script>

<div data-testid="step-agents">
  <h2 class="text-lg font-semibold text-white mb-4">Select agents</h2>

  <div class="grid grid-cols-2 gap-3 mb-4">
    {#each availableAgents as agent (agent.type)}
      <button
        type="button"
        data-testid="agent-card"
        data-agent-type={agent.type}
        onclick={() => onToggleAgent(agent.type)}
        class="p-3 rounded-lg border text-left transition-all {isSelected(agent.type)
          ? 'bg-blue-500/20 border-blue-400/40 text-blue-300'
          : 'bg-white/5 border-white/10 text-white/70 hover:border-white/20'}"
      >
        <span data-testid="agent-card-{agent.type}">{agent.label}</span>
      </button>
    {/each}
  </div>

  {#if selectedAgents.length > 0}
    <div data-testid="selected-agents-list" class="mt-4">
      <h3 class="text-sm text-white/50 mb-2">Selected agents (drag to reorder)</h3>
      {#each selectedAgents as agent, i (agent.type)}
        <div
          data-testid="selected-agent-item"
          class="flex items-center gap-2 p-2 mb-1 rounded bg-white/5 border border-white/10"
        >
          <span data-testid="agent-drag-handle" class="cursor-grab text-white/30">&#x2630;</span>
          <span class="flex-1 text-white/80">{agent.label}</span>
          {#if i > 0}
            <button
              type="button"
              data-testid="agent-move-up"
              onclick={() => onMoveAgent(i, 'up')}
              class="text-white/40 hover:text-white/70 text-sm"
            >&#9650;</button>
          {/if}
          {#if i < selectedAgents.length - 1}
            <button
              type="button"
              data-testid="agent-move-down"
              onclick={() => onMoveAgent(i, 'down')}
              class="text-white/40 hover:text-white/70 text-sm"
            >&#9660;</button>
          {/if}
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
