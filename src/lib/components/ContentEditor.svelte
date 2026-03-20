<script lang="ts">
  import SocialPostEditor from './SocialPostEditor.svelte';
  import LandingPageEditor from './LandingPageEditor.svelte';
  import EmailEditor from './EmailEditor.svelte';
  import RejectDialog from './RejectDialog.svelte';

  let {
    content,
    onSave,
    onApprove,
    onReject,
    onClose,
  }: {
    content: {
      id: string;
      title: string;
      body: { html: string; text?: string; sections?: Array<{ id: string; type: string; label: string; content: string; variables?: Record<string, string> }>; platform?: string; slug?: string } | null;
      meta_description: string | null;
      tags: string[];
      content_type: string;
      status: string;
      created_at: string;
      updated_at: string;
    };
    onSave: (updates: { title: string; body: { html: string }; meta_description: string; tags: string[] }) => Promise<void>;
    onApprove: (id: string) => Promise<void>;
    onReject: (id: string, reason: string) => Promise<void>;
    onClose: () => void;
  } = $props();

  let title = $state(content.title);
  let body = $state(content.body?.html ?? '');
  let metaDescription = $state(content.meta_description ?? '');
  let tags = $state<string[]>([...content.tags]);
  let newTag = $state('');
  let rejecting = $state(false);

  const wordCount = $derived(body.split(/\s+/).filter(Boolean).length);
  const readingTime = $derived(Math.max(1, Math.ceil(wordCount / 200)));

  async function handleSave() {
    await onSave({ title, body: { html: body }, meta_description: metaDescription, tags });
  }

  async function handleApprove() {
    await onApprove(content.id);
  }

  async function handleReject(reason: string) {
    await onReject(content.id, reason);
    rejecting = false;
  }

  function addTag() {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      tags = [...tags, newTag.trim()];
      newTag = '';
    }
  }

  function removeTag(tag: string) {
    tags = tags.filter(t => t !== tag);
  }

  function handleContentChange(c: string) { body = c; }
  function handleSubjectChange(s: string) { title = s; }
  function handleBodyChange(b: string) { body = b; }

  function handleSectionChange(sectionId: string, sectionContent: string) {
    body = sectionContent;
  }
</script>

<div data-testid="content-editor" class="card bg-base-100 rounded-xl p-6 space-y-4 border border-base-300">
  <div class="flex items-center justify-between">
    <div data-testid="editor-context" class="text-sm text-base-content/60 space-x-4">
      <span>Type: {content.content_type}</span>
      <span>Status: {content.status}</span>
      <span>Created: {new Date(content.created_at).toLocaleDateString()}</span>
    </div>
    <button data-testid="editor-close-btn" class="btn btn-sm btn-ghost" onclick={onClose}>
      Close
    </button>
  </div>

  <input
    data-testid="editor-title-input"
    type="text"
    class="input input-bordered w-full text-xl font-bold"
    bind:value={title}
  />

  <div data-testid="editor-body">
    {#if content.content_type === 'social_post'}
      <SocialPostEditor
        content={body}
        platform={(content.body?.platform as 'linkedin' | 'twitter' | 'instagram') ?? 'linkedin'}
        onContentChange={handleContentChange}
      />
    {:else if content.content_type === 'landing_page'}
      <LandingPageEditor
        sections={(content.body?.sections as Array<{ id: string; type: 'header' | 'body' | 'cta' | 'faq'; label: string; content: string; variables?: Record<string, string> }>) ?? []}
        slug={(content.body?.slug as string) ?? ''}
        onSectionChange={handleSectionChange}
      />
    {:else if content.content_type === 'email'}
      <EmailEditor
        subject={title}
        body={body}
        onSubjectChange={handleSubjectChange}
        onBodyChange={handleBodyChange}
      />
    {:else}
      <textarea
        class="textarea textarea-bordered w-full min-h-[300px]"
        bind:value={body}
      ></textarea>
    {/if}
  </div>

  <textarea
    data-testid="editor-meta-input"
    class="textarea textarea-bordered w-full"
    placeholder="Meta description"
    bind:value={metaDescription}
  ></textarea>

  <div data-testid="editor-tags" class="flex flex-wrap gap-2 items-center">
    {#each tags as tag, index}
      <span data-testid="editor-tag-{index}" class="badge badge-outline gap-1">
        {tag}
        <button
          data-testid="editor-remove-tag-{index}"
          class="btn btn-ghost btn-xs"
          onclick={() => removeTag(tag)}
        >x</button>
      </span>
    {/each}
    <input
      data-testid="editor-add-tag-input"
      type="text"
      class="input input-bordered input-sm w-32"
      placeholder="Add tag"
      bind:value={newTag}
      onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') addTag(); }}
    />
    <button data-testid="editor-add-tag-btn" class="btn btn-sm btn-ghost" onclick={addTag}>+</button>
  </div>

  <div class="flex gap-4 text-sm text-base-content/60">
    <span data-testid="editor-word-count">{wordCount} words</span>
    <span data-testid="editor-reading-time">{readingTime} min read</span>
  </div>

  <div class="border-t border-base-300 pt-4 flex justify-end gap-3">
    <button data-testid="editor-reject-btn" class="btn btn-error btn-outline btn-sm" onclick={() => rejecting = true}>
      Reject
    </button>
    <button data-testid="editor-save-btn" class="btn btn-ghost btn-sm" onclick={handleSave}>
      Save Draft
    </button>
    <button data-testid="editor-approve-btn" class="btn btn-success btn-sm" onclick={handleApprove}>
      Approve
    </button>
  </div>

  <RejectDialog
    isOpen={rejecting}
    onConfirm={handleReject}
    onCancel={() => rejecting = false}
  />
</div>
