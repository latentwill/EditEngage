<script lang="ts">
  import ProjectBadge from './ProjectBadge.svelte';

  let {
    content,
    showProjectBadge,
    onApprove,
    onReject
  }: {
    content: {
      id: string;
      title: string;
      body: { html: string; text?: string };
      tags: string[];
      status: string;
      content_type: string;
      created_at: string;
      pipeline?: { name: string };
      project?: { name: string; color: string };
    };
    showProjectBadge: boolean;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
  } = $props();

  function formatRelativeTime(isoString: string): string {
    const now = Date.now();
    const then = new Date(isoString).getTime();
    const diffMs = now - then;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    return `${diffSeconds}s ago`;
  }

  const relativeTime = $derived(formatRelativeTime(content.created_at));
  const bodyText = $derived(content.body.text ?? content.body.html.replace(/<[^>]*>/g, ''));
</script>

<div data-testid="feed-card" class="card bg-base-200/60 backdrop-blur-md rounded-xl p-4">
  <div class="flex items-center gap-2 mb-2">
    {#if showProjectBadge && content.project}
      <ProjectBadge project={content.project} />
    {/if}
    {#if content.pipeline}
      <span data-testid="feed-card-pipeline" class="text-xs text-base-content/60">{content.pipeline.name}</span>
    {/if}
    <span data-testid="feed-card-timestamp" class="text-xs text-base-content/40 ml-auto">{relativeTime}</span>
  </div>

  <h3 data-testid="feed-card-title" class="text-base font-semibold text-base-content mb-1">
    {content.title}
  </h3>

  <p data-testid="feed-card-body" class="text-sm text-base-content/70 line-clamp-4 mb-2">
    {bodyText}
  </p>

  <div data-testid="feed-card-tags" class="flex flex-wrap gap-1 mb-3">
    {#each content.tags as tag}
      <span class="badge badge-xs badge-outline">{tag}</span>
    {/each}
  </div>

  <div class="flex items-center gap-2">
    <button
      data-testid="feed-card-approve-btn"
      class="btn btn-xs btn-success"
      onclick={() => onApprove(content.id)}
    >
      Approve
    </button>
    <button
      data-testid="feed-card-reject-btn"
      class="btn btn-xs btn-error"
      onclick={() => onReject(content.id)}
    >
      Reject
    </button>
    <a
      data-testid="feed-card-edit-link"
      href="/dashboard/write/content/{content.id}"
      class="btn btn-xs btn-ghost"
    >
      Edit
    </a>
  </div>
</div>
