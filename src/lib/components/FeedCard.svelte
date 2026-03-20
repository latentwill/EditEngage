<script lang="ts">
  import ProjectBadge from './ProjectBadge.svelte';
  import ContentEditor from './ContentEditor.svelte';

  let {
    content,
    showProjectBadge,
    onApprove,
    onReject,
    onSave,
    expanded = false,
    onExpand,
    onCollapse,
  }: {
    content: {
      id: string;
      title: string;
      body: { html: string; text?: string; sections?: Array<{ id: string; type: string; label: string; content: string; variables?: Record<string, string> }>; platform?: string; slug?: string } | null;
      tags: string[];
      status: string;
      content_type: string;
      created_at: string;
      updated_at?: string;
      meta_description?: string | null;
      pipeline?: { name: string };
      project?: { name: string; color: string };
    };
    showProjectBadge: boolean;
    onApprove: (id: string) => void;
    onReject: (id: string, reason?: string) => void;
    onSave?: (updates: { title: string; body: { html: string }; meta_description: string; tags: string[] }) => Promise<void>;
    expanded?: boolean;
    onExpand?: (id: string) => void;
    onCollapse?: (id: string) => void;
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
  const bodyText = $derived((content.body?.text ?? content.body?.html ?? '').replace(/<[^>]*>/g, ''));

  function handleEditorApprove(id: string) {
    return Promise.resolve(onApprove(id));
  }

  function handleEditorReject(id: string, reason: string) {
    return Promise.resolve(onReject(id, reason));
  }

  async function handleEditorSave(updates: { title: string; body: { html: string }; meta_description: string; tags: string[] }) {
    if (onSave) await onSave(updates);
  }

  function handleClose() {
    onCollapse?.(content.id);
  }
</script>

{#if expanded}
  <ContentEditor
    content={{
      id: content.id,
      title: content.title,
      body: content.body,
      meta_description: content.meta_description ?? null,
      tags: content.tags,
      content_type: content.content_type,
      status: content.status,
      created_at: content.created_at,
      updated_at: content.updated_at ?? content.created_at,
    }}
    onSave={handleEditorSave}
    onApprove={handleEditorApprove}
    onReject={handleEditorReject}
    onClose={handleClose}
  />
{:else}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div data-testid="feed-card" class="card bg-base-200/60 backdrop-blur-md rounded-xl p-4 cursor-pointer" onclick={() => onExpand?.(content.id)}>
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
        onclick={(e) => { e.stopPropagation(); onApprove(content.id); }}
      >
        Approve
      </button>
      <button
        data-testid="feed-card-reject-btn"
        class="btn btn-xs btn-error"
        onclick={(e) => { e.stopPropagation(); onReject(content.id); }}
      >
        Reject
      </button>
    </div>
  </div>
{/if}
