<script lang="ts">
  type AgentOption = {
    type: string;
    label: string;
  };

  type AgentConfigFields = {
    [agentType: string]: { key: string; label: string; required: boolean }[];
  };

  let {
    selectedAgents,
    agentConfigs,
    onConfigChange,
    validationError
  }: {
    selectedAgents: AgentOption[];
    agentConfigs: Record<string, Record<string, string>>;
    onConfigChange: (agentType: string, key: string, value: string) => void;
    validationError: string | null;
  } = $props();

  const configFieldsByAgent: AgentConfigFields = {
    topic_queue: [
      { key: 'max_topics', label: 'Max Topics', required: true }
    ],
    variety_engine: [
      { key: 'variation_count', label: 'Variation Count', required: true }
    ],
    seo_writer: [
      { key: 'target_keywords', label: 'Target Keywords', required: true }
    ],
    ghost_publisher: [
      { key: 'ghost_url', label: 'Ghost URL', required: true }
    ],
    postbridge_publisher: [
      { key: 'api_endpoint', label: 'API Endpoint', required: true }
    ],
    email_publisher: [
      { key: 'recipient_list', label: 'Recipient List', required: true }
    ],
    content_reviewer: [
      { key: 'review_criteria', label: 'Review Criteria', required: true }
    ],
    research_agent: [
      { key: 'research_sources', label: 'Research Sources', required: true }
    ],
    programmatic_page: [
      { key: 'template_slug', label: 'Template Slug', required: true }
    ]
  };
</script>

<div data-testid="step-config">
  <h2 class="text-lg font-semibold text-base-content mb-4">Configure agents</h2>

  {#each selectedAgents as agent (agent.type)}
    <div data-testid="agent-config-section-{agent.type}" class="mb-6 p-4 rounded-lg bg-base-200 border border-base-300">
      <h3 class="text-sm font-medium text-base-content/80 mb-3">{agent.label}</h3>

      {#each (configFieldsByAgent[agent.type] ?? []) as field (field.key)}
        <div class="mb-3">
          <label class="block text-base-content/50 text-xs mb-1" for="config-{agent.type}-{field.key}">
            {field.label}{#if field.required}<span class="text-red-400"> *</span>{/if}
          </label>
          <input
            id="config-{agent.type}-{field.key}"
            data-testid="agent-config-{agent.type}-{field.key}"
            type="text"
            value={agentConfigs[agent.type]?.[field.key] ?? ''}
            oninput={(e) => onConfigChange(agent.type, field.key, (e.target as HTMLInputElement).value)}
            class="input input-bordered w-full text-sm"
          />
        </div>
      {/each}
    </div>
  {/each}

  {#if validationError}
    <div data-testid="config-validation-error" class="text-red-400 text-sm mt-2">
      {validationError}
    </div>
  {/if}
</div>
