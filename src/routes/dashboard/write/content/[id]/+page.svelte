<script lang="ts">
  let { data }: {
    data: {
      content: {
        id: string;
        title: string;
        body: { html: string } | null;
        meta_description: string | null;
        tags: string[];
        content_type: string;
        status: string;
        published_at: string | null;
        published_url: string | null;
        destination_type: string | null;
        destination_config: Record<string, unknown> | null;
        created_at: string;
        updated_at: string;
      };
    };
  } = $props();

  let editing = $state(false);
  let editTitle = $state(data.content.title);
  let editBody = $state(data.content.body?.html ?? '');
  let editMeta = $state(data.content.meta_description ?? '');
  let rejecting = $state(false);
  let rejectReason = $state('');
  let status = $state(data.content.status);

  async function saveEdits() {
    const response = await fetch(`/api/v1/content/${data.content.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle,
        body: { html: editBody },
        meta_description: editMeta
      })
    });
    if (response.ok) {
      editing = false;
    }
  }

  async function approveContent() {
    const response = await fetch(`/api/v1/content/${data.content.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      status = 'approved';
    }
  }

  async function rejectContent() {
    if (!rejectReason.trim()) return;
    const response = await fetch(`/api/v1/content/${data.content.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason })
    });
    if (response.ok) {
      status = 'rejected';
      rejecting = false;
      rejectReason = '';
    }
  }

  function sanitizeHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/on\w+\s*=\s*'[^']*'/gi, '')
      .replace(/javascript:/gi, '');
  }

  const statusColors: Record<string, string> = {
    draft: 'badge-ghost',
    in_review: 'badge-warning',
    approved: 'badge-success',
    published: 'badge-info',
    rejected: 'badge-error'
  };
</script>

<div data-testid="content-detail-page" class="space-y-6 py-6 max-w-4xl mx-auto">
  <!-- Header with actions -->
  <div class="flex items-center justify-between">
    <div>
      <span data-testid="content-status" class="badge {statusColors[status] ?? 'badge-ghost'}">
        {status}
      </span>
    </div>
    <div class="flex gap-2">
      <button
        data-testid="edit-btn"
        class="btn btn-info btn-sm"
        onclick={() => editing = !editing}
      >
        {editing ? 'Cancel' : 'Edit'}
      </button>
      {#if status === 'in_review'}
        <button
          data-testid="approve-btn"
          class="btn btn-success btn-sm"
          onclick={approveContent}
        >
          Approve
        </button>
        <button
          data-testid="reject-btn"
          class="btn btn-error btn-sm"
          onclick={() => rejecting = true}
        >
          Reject
        </button>
      {/if}
    </div>
  </div>

  <!-- Content card -->
  <div class="card bg-base-200 shadow-xl p-6 space-y-4">
    {#if editing}
      <div class="space-y-4">
        <div>
          <label for="edit-title" class="block text-xs text-base-content/50 uppercase tracking-wide mb-1">Title</label>
          <input
            id="edit-title"
            data-testid="edit-title-input"
            type="text"
            bind:value={editTitle}
            class="input input-bordered w-full"
          />
        </div>
        <div>
          <label for="edit-meta" class="block text-xs text-base-content/50 uppercase tracking-wide mb-1">Meta Description</label>
          <input
            id="edit-meta"
            data-testid="edit-meta-input"
            type="text"
            bind:value={editMeta}
            class="input input-bordered w-full"
          />
        </div>
        <div>
          <label for="edit-body" class="block text-xs text-base-content/50 uppercase tracking-wide mb-1">Body</label>
          <textarea
            id="edit-body"
            data-testid="edit-body-input"
            bind:value={editBody}
            rows="10"
            class="textarea textarea-bordered w-full"
          ></textarea>
        </div>
        <button
          data-testid="save-edits-btn"
          class="btn btn-success btn-sm"
          onclick={saveEdits}
        >
          Save
        </button>
      </div>
    {:else}
      <h1 data-testid="content-title" class="text-2xl font-bold text-base-content">{data.content.title}</h1>
      {#if data.content.meta_description}
        <p data-testid="content-meta" class="text-sm text-base-content/60">{data.content.meta_description}</p>
      {/if}
      <div data-testid="content-tags" class="flex gap-2 flex-wrap">
        {#each data.content.tags as tag}
          <span class="badge badge-ghost">{tag}</span>
        {/each}
      </div>
      {#if data.content.body}
        <div data-testid="content-body" class="prose prose-invert max-w-none">
          {@html sanitizeHtml(data.content.body.html)}
        </div>
      {/if}
    {/if}
  </div>

  <!-- Reject dialog -->
  {#if rejecting}
    <div data-testid="reject-dialog" class="card bg-base-200 border-error p-6 space-y-4">
      <h3 class="text-lg font-semibold text-error">Reject Content</h3>
      <div>
        <label for="reject-reason" class="block text-xs text-base-content/50 uppercase tracking-wide mb-1">Reason for rejection</label>
        <textarea
          id="reject-reason"
          data-testid="reject-reason-input"
          bind:value={rejectReason}
          rows="3"
          class="textarea textarea-bordered w-full"
          placeholder="Explain why this content is being rejected..."
        ></textarea>
      </div>
      <div class="flex gap-2">
        <button
          data-testid="confirm-reject-btn"
          class="btn btn-error btn-sm"
          onclick={rejectContent}
        >
          Confirm Rejection
        </button>
        <button
          class="btn btn-ghost"
          onclick={() => { rejecting = false; rejectReason = ''; }}
        >
          Cancel
        </button>
      </div>
    </div>
  {/if}
</div>
