<script lang="ts">
  import type { AgentContextData } from '../../routes/dashboard/write/agents/agentContext.js';

  let { context }: { context: AgentContextData } = $props();

  const DESTINATION_LABELS: Record<string, string> = {
    ghost: 'Ghost',
    postbridge: 'PostBridge',
    email: 'Email'
  };

  function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
</script>

<div data-testid="agent-context-bundle" class="mt-3 flex flex-wrap items-center gap-2 text-xs">
  <span data-testid="workflow-count" class="badge badge-outline badge-sm">
    {context.workflowCount === 0 ? 'No workflows' : `${context.workflowCount} workflow${context.workflowCount === 1 ? '' : 's'}`}
  </span>

  {#if context.workflowCount > 0 && context.topicCount > 0}
    <span data-testid="topic-count" class="badge badge-outline badge-sm">
      {context.topicCount} topic{context.topicCount === 1 ? '' : 's'}
    </span>
  {/if}

  {#if context.workflowCount > 0 && context.writingStyleName}
    <span data-testid="writing-style" class="badge badge-outline badge-sm">
      {context.writingStyleName}
    </span>
  {/if}

  {#if context.workflowCount > 0 && context.destinations.length > 0}
    <span data-testid="destinations" class="flex gap-1">
      {#each context.destinations as dest}
        <span class="badge badge-outline badge-sm">{DESTINATION_LABELS[dest] ?? dest}</span>
      {/each}
    </span>
  {/if}

  <span data-testid="last-activity" class="text-base-content/50">
    {context.lastActivity ? relativeTime(context.lastActivity) : 'No activity'}
  </span>
</div>
