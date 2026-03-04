<script lang="ts">
  import { onMount } from 'svelte';
  import type { SelectedAgent } from '$lib/types/workflow';

  type Topic = {
    id: string;
    title: string;
    project_id: string;
    status: string;
  };

  type Destination = {
    id: string;
    name: string;
    type: string;
    project_id: string;
  };

  let {
    projectId,
    selectedAgents,
    agentConfigs,
    onConfigChange,
    validationError
  }: {
    projectId: string;
    selectedAgents: SelectedAgent[];
    agentConfigs: Record<string, Record<string, string>>;
    onConfigChange: (agentId: string, key: string, value: string) => void;
    validationError: string | null;
  } = $props();

  let topics = $state<Topic[]>([]);
  let destinations = $state<Destination[]>([]);
  let loading = $state(true);

  onMount(async () => {
    try {
      const [topicsRes, destsRes] = await Promise.all([
        fetch(`/api/v1/topics?project_id=${projectId}`),
        fetch(`/api/v1/destinations?project_id=${projectId}`)
      ]);

      if (topicsRes.ok) {
        const topicsResult = await topicsRes.json();
        topics = topicsResult.data ?? [];
      }

      if (destsRes.ok) {
        const destsResult = await destsRes.json();
        destinations = destsResult.data ?? [];
      }
    } catch {
      // fetch failed
    } finally {
      loading = false;
    }
  });
</script>

<div data-testid="step-config">
  <h2 class="text-lg font-semibold text-base-content mb-4">Configure agents</h2>

  {#if !loading && topics.length === 0}
    <div class="text-base-content/50 text-sm mb-4">
      No topics found. <a href="/dashboard/write/topics" class="link link-primary">Create topics</a> first.
    </div>
  {/if}

  {#each selectedAgents as agent (agent.id)}
    <div data-testid="agent-config-section-{agent.id}" class="mb-6 p-4 rounded-lg bg-base-200 border border-base-300">
      <h3 class="text-sm font-medium text-base-content/80 mb-3">{agent.name}</h3>

      <div class="mb-3">
        <label class="block text-base-content/50 text-xs mb-1" for="topic-{agent.id}">
          Topic<span class="text-red-400"> *</span>
        </label>
        <select
          id="topic-{agent.id}"
          data-testid="agent-topic-select-{agent.id}"
          value={agentConfigs[agent.id]?.topic_id ?? ''}
          onchange={(e) => onConfigChange(agent.id, 'topic_id', (e.target as HTMLSelectElement).value)}
          class="select select-bordered w-full text-sm"
        >
          <option value="" disabled>Select a topic</option>
          {#each topics as topic (topic.id)}
            <option value={topic.id}>{topic.title}</option>
          {/each}
        </select>
      </div>

      <div class="mb-3">
        <label class="block text-base-content/50 text-xs mb-1" for="dest-{agent.id}">
          Destination<span class="text-red-400"> *</span>
        </label>
        <select
          id="dest-{agent.id}"
          data-testid="agent-destination-select-{agent.id}"
          value={agentConfigs[agent.id]?.destination_id ?? ''}
          onchange={(e) => onConfigChange(agent.id, 'destination_id', (e.target as HTMLSelectElement).value)}
          class="select select-bordered w-full text-sm"
        >
          <option value="" disabled>Select a destination</option>
          {#each destinations as dest (dest.id)}
            <option value={dest.id}>{dest.name}</option>
          {/each}
        </select>
      </div>
    </div>
  {/each}

  {#if validationError}
    <div data-testid="config-validation-error" class="text-red-400 text-sm mt-2">
      {validationError}
    </div>
  {/if}
</div>
