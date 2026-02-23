<script lang="ts">
  import ProviderChainBuilder from './ProviderChainBuilder.svelte';

  let {
    availableProviders,
    availablePipelines,
    onComplete,
    onCancel
  }: {
    availableProviders: Array<{ provider: string; name: string }>;
    availablePipelines: Array<{ id: string; name: string }>;
    onComplete: (query: {
      name: string;
      prompt_template: string;
      provider_chain: Array<{ provider: string; role: string }>;
      synthesis_mode: string;
      auto_generate_topics: boolean;
      schedule: string | null;
      pipeline_id: string | null;
    }) => void;
    onCancel: () => void;
  } = $props();

  let currentStep = $state(1);

  // Step 1 state
  let queryName = $state('');
  let promptTemplate = $state('');

  // Step 2 state
  let providerChain: Array<{ provider: string; role: string }> = $state([]);

  // Step 3 state
  let synthesisMode = $state('unified');
  let autoGenerateTopics = $state(false);

  // Step 4 state
  let schedule = $state('manual');
  let pipelineId = $state('');

  let canProceed = $derived(
    currentStep === 1 ? queryName.trim().length > 0 :
    currentStep === 2 ? providerChain.length > 0 :
    true
  );

  function nextStep(): void {
    if (canProceed && currentStep < 4) {
      currentStep += 1;
    }
  }

  function prevStep(): void {
    if (currentStep > 1) {
      currentStep -= 1;
    }
  }

  function handleChainChange(chain: Array<{ provider: string; role: string }>): void {
    providerChain = chain;
  }

  function handleSubmit(): void {
    onComplete({
      name: queryName,
      prompt_template: promptTemplate,
      provider_chain: providerChain,
      synthesis_mode: synthesisMode,
      auto_generate_topics: autoGenerateTopics,
      schedule: schedule === 'manual' ? null : schedule,
      pipeline_id: pipelineId || null
    });
  }
</script>

<div data-testid="research-wizard" class="card bg-base-100 shadow-xl p-6 space-y-6">
  {#if currentStep === 1}
    <div data-testid="wizard-step-1" class="space-y-4">
      <h2 class="text-lg font-semibold">Step 1: Name & Prompt</h2>
      <div class="form-control">
        <label class="label" for="query-name">
          <span class="label-text">Query Name</span>
        </label>
        <input
          id="query-name"
          data-testid="wizard-name-input"
          type="text"
          class="input input-bordered"
          placeholder="Enter query name"
          bind:value={queryName}
        />
      </div>
      <div class="form-control">
        <label class="label" for="prompt-template">
          <span class="label-text">Prompt Template</span>
        </label>
        <textarea
          id="prompt-template"
          data-testid="wizard-prompt-input"
          class="textarea textarea-bordered"
          placeholder={"Use {topic} and {keywords} as variables"}
          bind:value={promptTemplate}
        ></textarea>
      </div>
    </div>
  {/if}

  {#if currentStep === 2}
    <div data-testid="wizard-step-2" class="space-y-4">
      <h2 class="text-lg font-semibold">Step 2: Provider Chain</h2>
      <ProviderChainBuilder
        {availableProviders}
        chain={providerChain}
        onChainChange={handleChainChange}
      />
    </div>
  {/if}

  {#if currentStep === 3}
    <div data-testid="wizard-step-3" class="space-y-4">
      <h2 class="text-lg font-semibold">Step 3: Output Settings</h2>
      <div class="form-control">
        <span class="label">
          <span class="label-text">Synthesis Mode</span>
        </span>
        <div class="flex flex-col gap-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              data-testid="synthesis-mode-unified"
              type="radio"
              name="synthesis-mode"
              class="radio"
              value="unified"
              checked={synthesisMode === 'unified'}
              onchange={() => (synthesisMode = 'unified')}
            />
            <span>Unified</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              data-testid="synthesis-mode-per_provider"
              type="radio"
              name="synthesis-mode"
              class="radio"
              value="per_provider"
              checked={synthesisMode === 'per_provider'}
              onchange={() => (synthesisMode = 'per_provider')}
            />
            <span>Per Provider</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              data-testid="synthesis-mode-comparative"
              type="radio"
              name="synthesis-mode"
              class="radio"
              value="comparative"
              checked={synthesisMode === 'comparative'}
              onchange={() => (synthesisMode = 'comparative')}
            />
            <span>Comparative</span>
          </label>
        </div>
      </div>
      <div class="form-control">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            data-testid="auto-topics-toggle"
            type="checkbox"
            class="toggle"
            bind:checked={autoGenerateTopics}
          />
          <span class="label-text">Auto-generate topics</span>
        </label>
      </div>
    </div>
  {/if}

  {#if currentStep === 4}
    <div data-testid="wizard-step-4" class="space-y-4">
      <h2 class="text-lg font-semibold">Step 4: Schedule & Pipeline</h2>
      <div class="form-control">
        <label class="label" for="schedule-sel">
          <span class="label-text">Schedule</span>
        </label>
        <select
          id="schedule-sel"
          data-testid="schedule-select"
          class="select select-bordered"
          bind:value={schedule}
        >
          <option value="manual">Manual</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="custom">Custom Cron</option>
        </select>
      </div>
      <div class="form-control">
        <label class="label" for="pipeline-sel">
          <span class="label-text">Pipeline (optional)</span>
        </label>
        <select
          id="pipeline-sel"
          data-testid="pipeline-select"
          class="select select-bordered"
          bind:value={pipelineId}
        >
          <option value="">None</option>
          {#each availablePipelines as pipeline}
            <option value={pipeline.id}>{pipeline.name}</option>
          {/each}
        </select>
      </div>
    </div>
  {/if}

  <div class="flex justify-between items-center pt-4 border-t border-base-300">
    <button
      data-testid="wizard-cancel-btn"
      class="btn btn-ghost"
      onclick={onCancel}
    >
      Cancel
    </button>
    <div class="flex gap-2">
      {#if currentStep > 1}
        <button
          data-testid="wizard-prev-btn"
          class="btn btn-outline"
          onclick={prevStep}
        >
          Previous
        </button>
      {/if}
      {#if currentStep < 4}
        <button
          data-testid="wizard-next-btn"
          class="btn btn-primary"
          onclick={nextStep}
          disabled={!canProceed}
        >
          Next
        </button>
      {/if}
      {#if currentStep === 4}
        <button
          data-testid="wizard-submit-btn"
          class="btn btn-success"
          onclick={handleSubmit}
        >
          Create Query
        </button>
      {/if}
    </div>
  </div>
</div>
