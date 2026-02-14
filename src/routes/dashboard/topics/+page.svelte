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

  const statusColors: Record<TopicStatus, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    completed: 'bg-emerald-500/20 text-emerald-400',
    skipped: 'bg-white/10 text-white/60'
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
        notes: newNotes || undefined
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
    <h1 class="text-2xl font-bold text-white">Topic Queue</h1>
    <div class="flex items-center gap-3">
      <button
        data-testid="import-topics-button"
        class="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/80 hover:bg-white/[0.12] transition-all duration-300"
        onclick={() => { showImportForm = !showImportForm; }}
      >
        Import CSV
      </button>
      <button
        data-testid="add-topic-button"
        class="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 hover:bg-emerald-500/30 transition-all duration-300"
        onclick={() => { showAddForm = !showAddForm; }}
      >
        Add Topic
      </button>
    </div>
  </div>

  <!-- Add Topic Form -->
  {#if showAddForm}
    <div class="backdrop-blur-[20px] bg-white/[0.08] border border-white/[0.08] rounded-xl p-6 space-y-4">
      <h2 class="text-lg font-semibold text-white">Add New Topic</h2>
      <div class="space-y-3">
        <input
          data-testid="topic-title-input"
          type="text"
          placeholder="Topic title"
          class="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder-white/40"
          value={newTitle}
          oninput={(e: Event) => { newTitle = (e.target as HTMLInputElement).value; }}
        />
        <input
          data-testid="topic-keywords-input"
          type="text"
          placeholder="Keywords (comma-separated)"
          class="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder-white/40"
          value={newKeywords}
          oninput={(e: Event) => { newKeywords = (e.target as HTMLInputElement).value; }}
        />
        <textarea
          data-testid="topic-notes-input"
          placeholder="Notes (optional)"
          class="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder-white/40 resize-none"
          rows="3"
          value={newNotes}
          oninput={(e: Event) => { newNotes = (e.target as HTMLTextAreaElement).value; }}
        ></textarea>
        <button
          data-testid="topic-submit-button"
          class="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 hover:bg-emerald-500/30 transition-all duration-300"
          onclick={handleAddTopic}
        >
          Save Topic
        </button>
      </div>
    </div>
  {/if}

  <!-- Import Form -->
  {#if showImportForm}
    <div class="backdrop-blur-[20px] bg-white/[0.08] border border-white/[0.08] rounded-xl p-6 space-y-4">
      <h2 class="text-lg font-semibold text-white">Import Topics</h2>
      <div class="flex items-center gap-3">
        <input
          data-testid="csv-file-input"
          type="file"
          accept=".csv,.json"
          class="text-sm text-white/60"
          onchange={handleFileChange}
        />
        <button
          data-testid="csv-upload-button"
          class="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-400 hover:bg-emerald-500/30 transition-all duration-300"
          onclick={handleImportUpload}
        >
          Upload
        </button>
      </div>
      {#if importSummary}
        <div data-testid="import-summary" class="p-4 rounded-lg bg-white/[0.04] border border-white/[0.06] space-y-2">
          <p class="text-sm text-white/80">
            Imported: <span data-testid="import-count" class="text-emerald-400 font-medium">{importSummary.imported}</span>
          </p>
          <p class="text-sm text-white/80">
            Skipped: <span data-testid="import-skipped" class="text-yellow-400 font-medium">{importSummary.skipped}</span>
          </p>
          {#if importSummary.errors.length > 0}
            <div class="text-sm text-red-400">
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
  <div class="flex items-center gap-1 border-b border-white/[0.08]">
    <button
      data-testid="tab-pending"
      class="px-4 py-2 text-sm font-medium transition-all duration-200 {activeTab === 'pending' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-white/60 hover:text-white/80'}"
      onclick={() => { activeTab = 'pending'; }}
    >
      Pending
    </button>
    <button
      data-testid="tab-completed"
      class="px-4 py-2 text-sm font-medium transition-all duration-200 {activeTab === 'completed' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-white/60 hover:text-white/80'}"
      onclick={() => { activeTab = 'completed'; }}
    >
      Completed
    </button>
    <button
      data-testid="tab-skipped"
      class="px-4 py-2 text-sm font-medium transition-all duration-200 {activeTab === 'skipped' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-white/60 hover:text-white/80'}"
      onclick={() => { activeTab = 'skipped'; }}
    >
      Skipped
    </button>
    <button
      data-testid="tab-variety-memory"
      class="px-4 py-2 text-sm font-medium transition-all duration-200 {activeTab === 'variety-memory' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-white/60 hover:text-white/80'}"
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
          class="backdrop-blur-[20px] bg-white/[0.08] border border-white/[0.08] rounded-xl p-4 hover:bg-white/[0.12] transition-all duration-300"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span data-testid="topic-title" class="text-sm font-medium text-white">{topic.title}</span>
              <span
                data-testid="topic-status-badge"
                class="text-xs px-2 py-0.5 rounded-full {statusColors[topic.status]}"
              >
                {topic.status}
              </span>
              {#if topic.seo_score !== null}
                <span data-testid="topic-seo-score" class="text-xs text-white/40">
                  SEO: {topic.seo_score}
                </span>
              {/if}
            </div>
            <div class="flex items-center gap-3">
              {#if topic.keywords.length > 0}
                <div class="flex gap-1">
                  {#each topic.keywords as keyword}
                    <span class="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-white/50">
                      {keyword}
                    </span>
                  {/each}
                </div>
              {/if}
              {#if topic.status === 'pending'}
                <button
                  data-testid="skip-topic-button"
                  class="text-xs px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white/80 hover:bg-white/[0.12] transition-all duration-200"
                  onclick={() => handleSkipTopic(topic.id)}
                >
                  Skip
                </button>
              {/if}
            </div>
          </div>
          {#if topic.notes}
            <p class="mt-2 text-xs text-white/40">{topic.notes}</p>
          {/if}
        </div>
      {/each}

      {#if filteredTopics.length === 0}
        <div class="py-8 text-center text-sm text-white/40">
          No {activeTab} topics.
        </div>
      {/if}
    </div>
  {/if}

  <!-- Variety Memory Viewer -->
  {#if activeTab === 'variety-memory'}
    <div class="space-y-2">
      {#each data.varietyMemory as memoryItem}
        <div
          data-testid="variety-memory-item"
          class="backdrop-blur-[20px] bg-white/[0.08] border border-white/[0.08] rounded-xl p-4 hover:bg-white/[0.12] transition-all duration-300"
        >
          <div class="flex items-center justify-between">
            <span data-testid="canonical-line" class="text-sm text-white/80 italic">
              "{memoryItem.canonical_line}"
            </span>
            <div class="flex items-center gap-3">
              {#if memoryItem.content_id}
                <a
                  data-testid="content-link"
                  href="/dashboard/content/{memoryItem.content_id}"
                  class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  View Content
                </a>
              {/if}
              <span class="text-xs text-white/40">
                {new Date(memoryItem.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      {/each}

      {#if data.varietyMemory.length === 0}
        <div class="py-8 text-center text-sm text-white/40">
          No variety memory entries yet.
        </div>
      {/if}
    </div>
  {/if}
</div>
