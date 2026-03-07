<script lang="ts">
  import type { TopicStatus } from '$lib/types/database.js';

  type TopicItem = {
    id: string;
    project_id: string;
    pipeline_id: string | null;
    title: string;
    keywords: string[];
    seo_score: number | null;
    status: TopicStatus;
    notes: string | null;
    completed_at: string | null;
    content_id: string | null;
    created_at: string;
  };

  type VarietyMemoryItem = {
    id: string;
    project_id: string;
    canonical_line: string;
    content_id: string | null;
    created_at: string;
  };

  let { data }: {
    data: {
      topics: TopicItem[];
      varietyMemory: VarietyMemoryItem[];
      projectId: string;
    };
  } = $props();

  let activeTab = $state<'pending' | 'completed' | 'skipped' | 'variety-memory'>('pending');
  let showAddForm = $state(false);
  let showImportForm = $state(false);

  // Add topic form state
  let newTitle = $state('');
  let newKeywords = $state('');
  let newNotes = $state('');

  // Import state
  let importFile = $state<File | null>(null);
  let importSummary = $state<{ imported: number; skipped: number; errors: string[] } | null>(null);

  // Local topics state for optimistic updates
  let localTopics = $state<TopicItem[]>(data.topics);

  // Delete confirmation state
  let deleteConfirmId = $state<string | null>(null);
  let deleteError = $state<string | null>(null);

  function parseCanonicalLine(line: string): { intent: string; entity: string; angle: string } | null {
    const parts = line.split(' | ');
    if (parts.length === 3) {
      return { intent: parts[0], entity: parts[1], angle: parts[2] };
    }
    return null;
  }

  function relativeTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    return 'just now';
  }

  const statusColors: Record<TopicStatus, string> = {
    pending: 'badge-warning',
    in_progress: 'badge-info',
    completed: 'badge-success',
    skipped: 'badge-ghost'
  };

  let filteredTopics = $derived(
    localTopics
      .filter((topic) => topic.status === activeTab)
      .sort((a, b) => (b.seo_score ?? 0) - (a.seo_score ?? 0))
  );

  async function handleAddTopic() {
    const keywords = newKeywords.split(',').map((k) => k.trim()).filter(Boolean);
    const response = await fetch('/api/v1/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle,
        keywords,
        notes: newNotes || undefined,
        project_id: data.projectId
      })
    });

    if (response.ok) {
      const result = await response.json();
      localTopics = [...localTopics, result.data];
      newTitle = '';
      newKeywords = '';
      newNotes = '';
      showAddForm = false;
    }
  }

  async function handleDeleteTopic(topicId: string) {
    const response = await fetch(`/api/v1/topics/${topicId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      localTopics = localTopics.filter((t) => t.id !== topicId);
      deleteConfirmId = null;
      deleteError = null;
    } else {
      deleteError = 'Failed to delete topic';
    }
  }

  async function handleSkipTopic(topicId: string) {
    const response = await fetch(`/api/v1/topics/${topicId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'skipped' })
    });

    if (response.ok) {
      localTopics = localTopics.map((t) =>
        t.id === topicId ? { ...t, status: 'skipped' as TopicStatus } : t
      );
    }
  }

  async function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      importFile = target.files[0];
    }
  }

  async function handleImportUpload() {
    if (!importFile) return;

    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('project_id', data.projectId);

    const response = await fetch('/api/v1/topics/import', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const result = await response.json();
      importSummary = result.data;
    }
  }
</script>

<div data-testid="topics-page" class="space-y-8 py-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-base-content">Topic Queue</h1>
    <div class="flex items-center gap-3">
      <button
        data-testid="import-topics-button"
        class="btn btn-ghost"
        onclick={() => { showImportForm = !showImportForm; }}
      >
        Import CSV
      </button>
      <button
        data-testid="add-topic-button"
        class="btn btn-primary btn-sm"
        onclick={() => { showAddForm = !showAddForm; }}
      >
        Add Topic
      </button>
    </div>
  </div>

  <!-- Add Topic Form -->
  {#if showAddForm}
    <div class="card bg-base-200 shadow-xl p-6 space-y-4">
      <h2 class="text-lg font-semibold text-base-content">Add New Topic</h2>
      <div class="space-y-3">
        <input
          data-testid="topic-title-input"
          type="text"
          placeholder="Topic title"
          class="input input-bordered w-full"
          value={newTitle}
          oninput={(e: Event) => { newTitle = (e.target as HTMLInputElement).value; }}
        />
        <input
          data-testid="topic-keywords-input"
          type="text"
          placeholder="Keywords (comma-separated)"
          class="input input-bordered w-full"
          value={newKeywords}
          oninput={(e: Event) => { newKeywords = (e.target as HTMLInputElement).value; }}
        />
        <textarea
          data-testid="topic-notes-input"
          placeholder="Notes (optional)"
          class="textarea textarea-bordered w-full resize-none"
          rows="3"
          value={newNotes}
          oninput={(e: Event) => { newNotes = (e.target as HTMLTextAreaElement).value; }}
        ></textarea>
        <button
          data-testid="topic-submit-button"
          class="btn btn-primary btn-sm"
          onclick={handleAddTopic}
        >
          Save Topic
        </button>
      </div>
    </div>
  {/if}

  <!-- Import Form -->
  {#if showImportForm}
    <div class="card bg-base-200 shadow-xl p-6 space-y-4">
      <h2 class="text-lg font-semibold text-base-content">Import Topics</h2>
      <div class="flex items-center gap-3">
        <input
          data-testid="csv-file-input"
          type="file"
          accept=".csv,.json"
          class="file-input file-input-bordered w-full max-w-xs"
          onchange={handleFileChange}
        />
        <button
          data-testid="csv-upload-button"
          class="btn btn-primary btn-sm"
          onclick={handleImportUpload}
        >
          Upload
        </button>
      </div>
      {#if importSummary}
        <div data-testid="import-summary" class="card bg-base-200/50 p-4 space-y-2">
          <p class="text-sm text-base-content/80">
            Imported: <span data-testid="import-count" class="text-success font-medium">{importSummary.imported}</span>
          </p>
          <p class="text-sm text-base-content/80">
            Skipped: <span data-testid="import-skipped" class="text-warning font-medium">{importSummary.skipped}</span>
          </p>
          {#if importSummary.errors.length > 0}
            <div class="text-sm text-error">
              {#each importSummary.errors as error}
                <p>{error}</p>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Tabs -->
  <div class="tabs tabs-bordered">
    <button
      data-testid="tab-pending"
      class="tab {activeTab === 'pending' ? 'tab-active' : ''}"
      onclick={() => { activeTab = 'pending'; }}
    >
      Pending
    </button>
    <button
      data-testid="tab-completed"
      class="tab {activeTab === 'completed' ? 'tab-active' : ''}"
      onclick={() => { activeTab = 'completed'; }}
    >
      Completed
    </button>
    <button
      data-testid="tab-skipped"
      class="tab {activeTab === 'skipped' ? 'tab-active' : ''}"
      onclick={() => { activeTab = 'skipped'; }}
    >
      Skipped
    </button>
    <button
      data-testid="tab-variety-memory"
      class="tab {activeTab === 'variety-memory' ? 'tab-active' : ''}"
      onclick={() => { activeTab = 'variety-memory'; }}
    >
      Variety Memory
    </button>
  </div>

  <!-- Topic List -->
  {#if activeTab !== 'variety-memory'}
    <div class="space-y-2">
      {#each filteredTopics as topic}
        <div
          data-testid="topic-item"
          class="card bg-base-200 shadow-xl p-4 hover:bg-base-300 transition-all duration-300"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span data-testid="topic-title" class="text-sm font-medium text-base-content">{topic.title}</span>
              <span
                data-testid="topic-status-badge"
                class="badge {statusColors[topic.status]}"
              >
                {topic.status}
              </span>
              {#if topic.seo_score !== null}
                <span data-testid="topic-seo-score" class="text-xs text-base-content/40">
                  SEO: {topic.seo_score}
                </span>
              {/if}
            </div>
            <div class="flex items-center gap-3">
              {#if topic.keywords.length > 0}
                <div class="flex gap-1">
                  {#each topic.keywords as keyword}
                    <span class="badge badge-ghost badge-sm">
                      {keyword}
                    </span>
                  {/each}
                </div>
              {/if}
              {#if topic.status === 'pending'}
                <button
                  data-testid="skip-topic-button"
                  class="btn btn-ghost btn-xs"
                  onclick={() => handleSkipTopic(topic.id)}
                >
                  Skip
                </button>
              {/if}
              <button
                data-testid="delete-topic-button"
                class="btn btn-ghost btn-xs text-error"
                onclick={() => { deleteConfirmId = topic.id; }}
              >
                Delete
              </button>
            </div>
          </div>
          {#if topic.notes}
            <p class="mt-2 text-xs text-base-content/40">{topic.notes}</p>
          {/if}
        </div>
      {/each}

      {#if filteredTopics.length === 0}
        <div class="py-8 text-center text-sm text-base-content/40">
          No {activeTab} topics.
        </div>
      {/if}
    </div>
  {/if}

  <!-- Variety Memory Viewer -->
  {#if activeTab === 'variety-memory'}
    <div class="space-y-2">
      <div data-testid="variety-memory-info" class="text-sm text-base-content/60 bg-base-200 rounded-lg p-3">
        The variety engine tracks which content angles have been used. It avoids repeating the same approach to keep content fresh and diverse.
      </div>

      <div data-testid="variety-memory-count" class="text-xs text-base-content/40">
        {data.varietyMemory.length} {data.varietyMemory.length === 1 ? 'entry' : 'entries'}
      </div>

      {#each data.varietyMemory as memoryItem}
        {@const parsed = parseCanonicalLine(memoryItem.canonical_line)}
        <div
          data-testid="variety-memory-item"
          class="card bg-base-200 shadow-xl p-4 hover:bg-base-300 transition-all duration-300"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 flex-wrap">
              {#if parsed}
                <span data-testid="line-intent" class="badge badge-sm badge-outline">Intent: {parsed.intent}</span>
                <span data-testid="line-entity" class="badge badge-sm badge-outline">Entity: {parsed.entity}</span>
                <span data-testid="line-angle" class="badge badge-sm badge-outline">Angle: {parsed.angle}</span>
              {:else}
                <span data-testid="canonical-line" class="text-sm text-base-content/80 italic">
                  "{memoryItem.canonical_line}"
                </span>
              {/if}
            </div>
            <div class="flex items-center gap-3">
              {#if memoryItem.content_id}
                <a
                  data-testid="content-link"
                  href="/dashboard/write/content/{memoryItem.content_id}"
                  class="text-xs text-primary hover:text-primary-focus transition-colors"
                >
                  View Content
                </a>
              {/if}
              <span data-testid="relative-time" class="text-xs text-base-content/40" title={new Date(memoryItem.created_at).toLocaleDateString()}>
                {relativeTime(memoryItem.created_at)}
              </span>
            </div>
          </div>
        </div>
      {/each}

      {#if data.varietyMemory.length === 0}
        <div class="py-8 text-center text-sm text-base-content/40">
          No variety memory entries yet.
        </div>
      {/if}
    </div>
  {/if}

  {#if deleteConfirmId}
    <div data-testid="delete-confirm-modal" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg">Delete Topic</h3>
        <p class="py-4">Are you sure? This cannot be undone.</p>
        {#if deleteError}
          <p data-testid="delete-error" class="text-error text-sm">{deleteError}</p>
        {/if}
        <div class="modal-action">
          <button
            data-testid="confirm-delete-button"
            class="btn btn-error"
            onclick={() => handleDeleteTopic(deleteConfirmId!)}
          >
            Delete
          </button>
          <button
            data-testid="cancel-delete-button"
            class="btn"
            onclick={() => { deleteConfirmId = null; deleteError = null; }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
