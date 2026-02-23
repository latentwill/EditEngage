<script lang="ts">
  import { goto } from '$app/navigation';
  import EditorNavBar from '$lib/components/EditorNavBar.svelte';
  import SocialPostEditor from '$lib/components/SocialPostEditor.svelte';
  import LandingPageEditor from '$lib/components/LandingPageEditor.svelte';
  import EmailEditor from '$lib/components/EmailEditor.svelte';
  import RejectDialog from '$lib/components/RejectDialog.svelte';
  import { createEditorStore } from '$lib/stores/editorStore';
  import { createSupabaseClient } from '$lib/supabase';

  let { data } = $props<{ data: { content: {
    id: string;
    title: string;
    body: Record<string, unknown> | null;
    meta_description: string | null;
    tags: string[];
    content_type: string;
    status: string;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
  } } }>();

  const client = createSupabaseClient();
  const editor = createEditorStore(client);

  // Extract initial values from server data (intentionally captured once)
  const initialContent = data.content;
  let title = $state(initialContent.title);
  let body = $state((initialContent.body?.html as string) ?? '');
  let metaDescription = $state(initialContent.meta_description ?? '');
  let tags = $state<string[]>(initialContent.tags ?? []);
  let newTag = $state('');
  let rejecting = $state(false);

  const wordCount = $derived(body.split(/\s+/).filter(Boolean).length);
  const readingTime = $derived(Math.max(1, Math.ceil(wordCount / 200)));

  function handleBack() {
    goto('/dashboard/feed');
  }

  async function handleSave() {
    await editor.saveContent({
      title,
      body: { html: body },
      meta_description: metaDescription,
      tags
    });
  }

  async function handleApprove() {
    await editor.approve();
  }

  async function handleReject(reason: string) {
    await editor.reject(reason);
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

  function handleContentChange(content: string) {
    body = content;
  }

  function handleSectionChange(sectionId: string, content: string) {
    const currentBody = data.content.body as Record<string, unknown> | null;
    const sections = (currentBody?.sections as Array<{ id: string; type: string; label: string; content: string; variables?: Record<string, string> }>) ?? [];
    const updated = sections.map(s => s.id === sectionId ? { ...s, content } : s);
    data.content.body = { ...currentBody, sections: updated };
  }

  function handleSubjectChange(subject: string) {
    title = subject;
  }

  function handleBodyChange(newBody: string) {
    body = newBody;
  }
</script>

<div data-testid="feed-editor-page" class="flex flex-col h-screen">
  <EditorNavBar
    position={editor.position}
    total={editor.total}
    hasPrev={editor.hasPrev}
    hasNext={editor.hasNext}
    onPrev={() => editor.prev()}
    onNext={() => editor.next()}
    onBack={handleBack}
  />

  <div class="flex-1 overflow-y-auto p-6 space-y-6">
    <input
      data-testid="editor-title-input"
      type="text"
      class="input input-bordered w-full text-2xl font-bold"
      bind:value={title}
    />

    <div data-testid="editor-body">
      {#if data.content.content_type === 'social_post'}
        <SocialPostEditor
          content={body}
          platform={(data.content.body?.platform as 'linkedin' | 'twitter' | 'instagram') ?? 'linkedin'}
          onContentChange={handleContentChange}
        />
      {:else if data.content.content_type === 'landing_page'}
        <LandingPageEditor
          sections={(data.content.body?.sections as Array<{ id: string; type: 'header' | 'body' | 'cta' | 'faq'; label: string; content: string; variables?: Record<string, string> }>) ?? []}
          slug={(data.content.body?.slug as string) ?? ''}
          onSectionChange={handleSectionChange}
        />
      {:else if data.content.content_type === 'email'}
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

    <div data-testid="editor-context" class="text-sm text-base-content/60 space-x-4">
      <span>Type: {data.content.content_type}</span>
      <span>Status: {data.content.status}</span>
      <span>Created: {new Date(data.content.created_at).toLocaleDateString()}</span>
    </div>

    <div class="flex gap-4 text-sm text-base-content/60">
      <span data-testid="editor-word-count">{wordCount} words</span>
      <span data-testid="editor-reading-time">{readingTime} min read</span>
    </div>
  </div>

  <div class="border-t border-base-300 px-6 py-4 flex justify-end gap-3">
    <button data-testid="editor-reject-btn" class="btn btn-error btn-outline" onclick={() => rejecting = true}>
      Reject
    </button>
    <button data-testid="editor-save-btn" class="btn btn-ghost" onclick={handleSave}>
      Save Draft
    </button>
    <button data-testid="editor-approve-btn" class="btn btn-success" onclick={handleApprove}>
      Approve
    </button>
  </div>

  <RejectDialog
    isOpen={rejecting}
    onConfirm={handleReject}
    onCancel={() => rejecting = false}
  />
</div>
