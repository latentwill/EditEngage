<script lang="ts">
  import { goto } from '$app/navigation';
  import type { WorkflowReviewMode } from '$lib/types/database';
  import type { SelectedAgent, UserAgent } from '$lib/types/workflow';
  import StepName from './wizard/StepName.svelte';
  import StepAgents from './wizard/StepAgents.svelte';
  import StepConfig from './wizard/StepConfig.svelte';
  import StepSchedule from './wizard/StepSchedule.svelte';

  let {
    projectId = ''
  }: {
    projectId?: string;
  } = $props();

  const TOTAL_STEPS = 5;

  let currentStep = $state(1);
  let workflowName = $state('');
  let workflowDescription = $state('');
  let selectedAgents = $state<SelectedAgent[]>([]);
  let agentConfigs = $state<Record<string, Record<string, string>>>({});
  let schedule = $state('');
  let reviewMode = $state<WorkflowReviewMode>('draft_for_review');

  // Track fetched agents for lookup when toggling
  let fetchedAgents = $state<UserAgent[]>([]);

  let nameError = $state<string | null>(null);
  let agentsError = $state<string | null>(null);
  let configError = $state<string | null>(null);
  let saveError = $state<string | null>(null);
  let saving = $state(false);

  function validateStep(): boolean {
    if (currentStep === 1) {
      if (!workflowName.trim()) {
        nameError = 'Workflow name is required';
        return false;
      }
      nameError = null;
      return true;
    }

    if (currentStep === 2) {
      if (selectedAgents.length === 0) {
        agentsError = 'Select at least one agent';
        return false;
      }
      agentsError = null;
      return true;
    }

    if (currentStep === 3) {
      for (const agent of selectedAgents) {
        const config = agentConfigs[agent.id];
        if (!config?.topic_id || !config?.destination_id) {
          configError = 'Each agent must have a topic and destination selected';
          return false;
        }
      }
      configError = null;
      return true;
    }

    return true;
  }

  function handleNext() {
    if (!validateStep()) return;
    if (currentStep < TOTAL_STEPS) {
      currentStep += 1;
    }
  }

  function handlePrevious() {
    if (currentStep > 1) {
      currentStep -= 1;
    }
  }

  function handleToggleAgent(agentId: string) {
    const existing = selectedAgents.findIndex((a) => a.id === agentId);
    if (existing >= 0) {
      selectedAgents = selectedAgents.filter((a) => a.id !== agentId);
    } else {
      const agent = fetchedAgents.find((a) => a.id === agentId);
      if (agent) {
        selectedAgents = [...selectedAgents, { id: agent.id, name: agent.name, type: agent.type }];
      }
    }
  }

  function handleConfigChange(agentId: string, key: string, value: string) {
    agentConfigs = {
      ...agentConfigs,
      [agentId]: {
        ...(agentConfigs[agentId] ?? {}),
        [key]: value
      }
    };
  }

  // Intercept agents fetched by StepAgents for use in toggle logic
  function handleAgentsFetched(agents: UserAgent[]) {
    fetchedAgents = agents;
  }

  async function handleSave() {
    saveError = null;
    saving = true;

    const body = {
      project_id: projectId,
      name: workflowName,
      description: workflowDescription,
      steps: selectedAgents.map((agent) => ({
        agent_id: agent.id,
        agent_type: agent.type,
        topic_id: agentConfigs[agent.id]?.topic_id ?? null,
        destination_id: agentConfigs[agent.id]?.destination_id ?? null
      })),
      schedule: schedule || null,
      review_mode: reviewMode
    };

    try {
      const response = await fetch('/api/v1/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await goto('/dashboard/workflows');
      } else {
        saveError = 'Failed to save workflow. Please try again.';
        saving = false;
      }
    } catch {
      saveError = 'Failed to save workflow. Please try again.';
      saving = false;
    }
  }
</script>

<div
  data-testid="workflow-wizard"
  class="card bg-base-200 border border-base-300 rounded-xl p-6 max-w-2xl mx-auto"
>
  <!-- Step Indicator -->
  <ul data-testid="wizard-step-indicator" class="steps steps-horizontal w-full mb-6">
    {#each Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1) as step (step)}
      <li
        class="step {step <= currentStep ? 'step-primary' : ''}"
      >
        {step}
      </li>
    {/each}
  </ul>

  <!-- Step Content -->
  {#if currentStep === 1}
    <StepName
      name={workflowName}
      description={workflowDescription}
      onNameChange={(v) => { workflowName = v; nameError = null; }}
      onDescriptionChange={(v) => { workflowDescription = v; }}
      validationError={nameError}
    />
  {:else if currentStep === 2}
    <StepAgents
      {projectId}
      {selectedAgents}
      onToggleAgent={handleToggleAgent}
      onAgentsFetched={handleAgentsFetched}
      validationError={agentsError}
    />
  {:else if currentStep === 3}
    <StepConfig
      {projectId}
      {selectedAgents}
      {agentConfigs}
      onConfigChange={handleConfigChange}
      validationError={configError}
    />
  {:else if currentStep === 4}
    <StepSchedule
      {schedule}
      {reviewMode}
      onScheduleChange={(v) => { schedule = v; }}
      onReviewModeChange={(v) => { reviewMode = v; }}
    />
  {:else if currentStep === 5}
    <div data-testid="step-review">
      <h2 class="text-lg font-semibold text-base-content mb-4">Review workflow</h2>
      <div class="space-y-2 text-sm text-base-content/70">
        <p><span class="font-medium text-base-content">Name:</span> {workflowName}</p>
        {#if workflowDescription}
          <p><span class="font-medium text-base-content">Description:</span> {workflowDescription}</p>
        {/if}
        <p><span class="font-medium text-base-content">Agents:</span> {selectedAgents.map(a => a.name).join(', ')}</p>
        <p><span class="font-medium text-base-content">Review mode:</span> {reviewMode}</p>
        {#if schedule}
          <p><span class="font-medium text-base-content">Schedule:</span> {schedule}</p>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Navigation -->
  <div class="flex justify-between mt-6 pt-4 border-t border-base-300">
    {#if currentStep > 1}
      <button
        type="button"
        data-testid="wizard-prev-btn"
        onclick={handlePrevious}
        class="btn btn-ghost"
      >
        Previous
      </button>
    {:else}
      <div></div>
    {/if}

    {#if currentStep < TOTAL_STEPS}
      <button
        type="button"
        data-testid="wizard-next-btn"
        onclick={handleNext}
        class="btn btn-primary"
      >
        Next
      </button>
    {:else}
      <button
        type="button"
        data-testid="wizard-save-btn"
        onclick={handleSave}
        disabled={saving}
        class="btn btn-primary"
      >
        {saving ? 'Saving...' : 'Save Workflow'}
      </button>
    {/if}
  </div>

  {#if saveError}
    <div data-testid="wizard-save-error" class="text-red-400 text-sm mt-2">
      {saveError}
    </div>
  {/if}
</div>
