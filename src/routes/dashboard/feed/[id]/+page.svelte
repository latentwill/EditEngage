<script lang="ts">
  import ContentEditor from '$lib/components/ContentEditor.svelte';
  import { goto } from '$app/navigation';
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

  async function handleSave(updates: { title: string; body: { html: string }; meta_description: string; tags: string[] }) {
    await editor.saveContent(updates);
  }

  async function handleApprove(id: string) {
    await editor.approve();
  }

  async function handleReject(id: string, reason: string) {
    await editor.reject(reason);
  }

  function handleClose() {
    goto('/dashboard/feed');
  }
</script>

<div data-testid="feed-editor-page" class="p-6">
  <ContentEditor
    content={{
      id: data.content.id,
      title: data.content.title,
      body: data.content.body as { html: string } | null,
      meta_description: data.content.meta_description,
      tags: data.content.tags,
      content_type: data.content.content_type,
      status: data.content.status,
      created_at: data.content.created_at,
      updated_at: data.content.updated_at,
    }}
    onSave={handleSave}
    onApprove={handleApprove}
    onReject={handleReject}
    onClose={handleClose}
  />
</div>
