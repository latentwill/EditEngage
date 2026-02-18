<script lang="ts">
  import type { PipelineReviewMode, DestinationType } from '$lib/types/database';
  import StepName from './wizard/StepName.svelte';
  import StepAgents from './wizard/StepAgents.svelte';
  import StepConfig from './wizard/StepConfig.svelte';
  import StepSchedule from './wizard/StepSchedule.svelte';
  import StepDestination from './wizard/StepDestination.svelte';

  type AgentOption = {
    type: string;
    label: string;
  };

  let {
    projectId = ''
  }: {
    projectId?: string;
  } = $props();

  const TOTAL_STEPS = 5;

  const AVAILABLE_AGENTS: AgentOption[] = [
    { type: 'topic_queue', label: 'Topic Queue' },
    { type: 'variety_engine', label: 'Variety Engine' },
    { type: 'seo_writer', label: 'SEO Writer' },
    { type: 'ghost_publisher', label: 'Ghost Publisher' },
    { type: 'postbridge_publisher', label: 'Postbridge Publisher' },
    { type: 'email_publisher', label: 'Email Publisher' },
    { type: 'content_reviewer', label: 'Content Reviewer' },
    { type: 'research_agent', label: 'Research Agent' },
    { type: 'programmatic_page', label: 'Programmatic Page' }
  ];

  const DESTINATIONS: { type: DestinationType; label: string }[] = [
    { type: 'ghost', label: 'Ghost CMS' },
    { type: 'postbridge', label: 'Postbridge' },
    { type: 'webhook', label: 'Webhook' }
  ];

  const REQUIRED_CONFIG_FIELDS: Record<string, string[]> = {
    topic_queue: ['max_topics'],
    variety_engine: ['variation_count'],
    seo_writer: ['target_keywords'],
    ghost_publisher: ['ghost_url'],
    postbridge_publisher: ['api_endpoint'],
    email_publisher: ['recipient_list'],
    content_reviewer: ['review_criteria'],
    research_agent: ['research_sources'],
    programmatic_page: ['template_slug']
  };

  let currentStep = $state(1);
  let pipelineName = $state('');
  let pipelineDescription = $state('');
  let selectedAgents = $state<AgentOption[]>([]);
  let agentConfigs = $state<Record<string, Record<string, string>>>({});
  let schedule = $state('');
  let reviewMode = $state<PipelineReviewMode>('draft_for_review');
  let selectedDestination = $state<DestinationType | null>(null);

  let nameError = $state<string | null>(null);
  let agentsError = $state<string | null>(null);
  let configError = $state<string | null>(null);

  function validateStep(): boolean {
    if (currentStep === 1) {
      if (!pipelineName.trim()) {
        nameError = 'Circuit name is required';
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
        const requiredFields = REQUIRED_CONFIG_FIELDS[agent.type] ?? [];
        for (const field of requiredFields) {
          const value = agentConfigs[agent.type]?.[field];
          if (!value || !value.trim()) {
            configError = `All required config fields must be filled`;
            return false;
          }
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

  function handleToggleAgent(agentType: string) {
    const existing = selectedAgents.findIndex((a) => a.type === agentType);
    if (existing >= 0) {
      selectedAgents = selectedAgents.filter((a) => a.type !== agentType);
    } else {
      const agent = AVAILABLE_AGENTS.find((a) => a.type === agentType);
      if (agent) {
        selectedAgents = [...selectedAgents, agent];
      }
    }
  }

  function handleMoveAgent(index: number, direction: 'up' | 'down') {
    const newAgents = [...selectedAgents];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newAgents.length) return;
    [newAgents[index], newAgents[targetIndex]] = [newAgents[targetIndex], newAgents[index]];
    selectedAgents = newAgents;
  }

  function handleConfigChange(agentType: string, key: string, value: string) {
    agentConfigs = {
      ...agentConfigs,
      [agentType]: {
        ...(agentConfigs[agentType] ?? {}),
        [key]: value
      }
    };
  }

  async function handleSave() {
    const body = {
      name: pipelineName,
      description: pipelineDescription,
      steps: selectedAgents.map((agent) => ({
        agentType: agent.type,
        config: agentConfigs[agent.type] ?? {}
      })),
      schedule: schedule || null,
      review_mode: reviewMode,
      destination: selectedDestination
    };

    await fetch('/api/v1/circuits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }
</script>

<div
  data-testid="pipeline-wizard"
  class="backdrop-blur-[20px] bg-[var(--glass-bg,rgba(255,255,255,0.08))] border border-[var(--glass-border,rgba(255,255,255,0.08))] rounded-xl p-6 max-w-2xl mx-auto"
>
  <!-- Step Indicator -->
  <div data-testid="wizard-step-indicator" class="flex items-center justify-center gap-2 mb-6">
    {#each Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1) as step (step)}
      <div
        class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all {step === currentStep
          ? 'bg-blue-500/30 text-blue-300 border border-blue-400/40'
          : step < currentStep
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/30'
            : 'bg-white/5 text-white/30 border border-white/10'}"
      >
        {step}
      </div>
      {#if step < TOTAL_STEPS}
        <div class="w-8 h-px {step < currentStep ? 'bg-emerald-400/30' : 'bg-white/10'}"></div>
      {/if}
    {/each}
  </div>

  <!-- Step Content -->
  {#if currentStep === 1}
    <StepName
      name={pipelineName}
      description={pipelineDescription}
      onNameChange={(v) => { pipelineName = v; nameError = null; }}
      onDescriptionChange={(v) => { pipelineDescription = v; }}
      validationError={nameError}
    />
  {:else if currentStep === 2}
    <StepAgents
      availableAgents={AVAILABLE_AGENTS}
      {selectedAgents}
      onToggleAgent={handleToggleAgent}
      onMoveAgent={handleMoveAgent}
      validationError={agentsError}
    />
  {:else if currentStep === 3}
    <StepConfig
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
    <StepDestination
      destinations={DESTINATIONS}
      {selectedDestination}
      onSelectDestination={(t) => { selectedDestination = t; }}
    />
  {/if}

  <!-- Navigation -->
  <div class="flex justify-between mt-6 pt-4 border-t border-white/10">
    {#if currentStep > 1}
      <button
        type="button"
        data-testid="wizard-prev-btn"
        onclick={handlePrevious}
        class="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all"
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
        class="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-300 hover:bg-blue-500/30 transition-all"
      >
        Next
      </button>
    {:else}
      <button
        type="button"
        data-testid="wizard-save-btn"
        onclick={handleSave}
        class="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/30 transition-all"
      >
        Save Circuit
      </button>
    {/if}
  </div>
</div>
