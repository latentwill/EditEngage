<script lang="ts">
  import StatCard from '$lib/components/StatCard.svelte';
  import FeedCard from '$lib/components/FeedCard.svelte';
  import { createSupabaseClient } from '$lib/supabase';

  let { data }: {
    data: {
      totalContent: number;
      publishedThisWeek: number;
      pendingReview: number;
      activeWorkflows: number;
      recentWorkflowRuns: Array<{
        id: string;
        pipeline_name: string;
        status: string;
        current_step: number;
        total_steps: number;
        created_at: string;
      }>;
      contentInReview: Array<{
        id: string;
        title: string;
        status: string;
        created_at: string;
      }>;
      topicQueueHealth: {
        pendingCount: number;
        nextScheduledRun: string | null;
      };
      activeProjectId: string;
      recentContent?: Array<{
        id: string;
        title: string;
        body: { html: string; text?: string } | null;
        tags: string[];
        status: string;
        content_type: string;
        created_at: string;
        updated_at?: string;
        meta_description?: string | null;
        projects?: { name: string; color: string | null } | null;
      }>;
    };
  } = $props();

  let expandedId = $state<string | null>(null);
  const client = createSupabaseClient();

  async function handleSave(id: string, updates: { title: string; body: { html: string }; meta_description: string; tags: string[] }) {
    await client.from('content').update(updates).eq('id', id);
  }

  async function handleApprove(id: string) {
    await client.from('content').update({ status: 'approved' }).eq('id', id);
  }

  async function handleReject(id: string, reason?: string) {
    await client.from('content').update({ status: 'rejected', destination_config: reason ? { rejection_reason: reason } : undefined }).eq('id', id);
  }

  const statusColors: Record<string, string> = {
    completed: 'badge-success',
    running: 'badge-info',
    queued: 'badge-warning',
    failed: 'badge-error'
  };
</script>

<div data-testid="dashboard-page" data-project-id={data.activeProjectId} class="space-y-8 py-6">
  <!-- Stat Cards -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard label="Total Content" value={String(data.totalContent)} />
    <StatCard label="Published This Week" value={String(data.publishedThisWeek)} />
    <StatCard label="Pending Review" value={String(data.pendingReview)} />
    <StatCard label="Active Workflows" value={String(data.activeWorkflows)} />
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Recent Workflow Runs -->
    <div
      data-testid="recent-workflow-runs"
      class="card bg-base-200 rounded-xl p-4"
    >
      <h2 class="text-sm font-semibold text-base-content/70 uppercase tracking-wide mb-3">Recent Workflow Runs</h2>
      <div class="space-y-2">
        {#each data.recentWorkflowRuns.slice(0, 5) as run}
          <div data-testid="workflow-run-item" class="flex items-center justify-between py-2 border-b border-base-300 last:border-0">
            <span class="text-sm text-base-content/80">{run.pipeline_name}</span>
            <span
              data-testid="run-status-badge"
              class="badge {statusColors[run.status] ?? 'badge-ghost'}"
            >
              {run.status}
            </span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Content Awaiting Review -->
    <div
      data-testid="content-in-review"
      class="card bg-base-200 rounded-xl p-4"
    >
      <h2 class="text-sm font-semibold text-base-content/70 uppercase tracking-wide mb-3">Content Awaiting Review</h2>
      <div class="space-y-2">
        {#each data.contentInReview as item}
          <div data-testid="review-item" class="flex items-center justify-between py-2 border-b border-base-300 last:border-0">
            <span class="text-sm text-base-content/80">{item.title}</span>
            <span class="badge badge-warning">
              {item.status}
            </span>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Topic Queue Health -->
  <div
    data-testid="topic-queue-health"
    class="card bg-base-200 rounded-xl p-4"
  >
    <h2 class="text-sm font-semibold text-base-content/70 uppercase tracking-wide mb-3">Topic Queue Health</h2>
    <div class="flex items-center gap-6">
      <div>
        <span class="text-2xl font-bold text-base-content">{data.topicQueueHealth.pendingCount}</span>
        <span class="text-xs text-base-content/50 ml-1">pending topics</span>
      </div>
      {#if data.topicQueueHealth.nextScheduledRun}
        <div class="text-sm text-base-content/60">
          Next run: {new Date(data.topicQueueHealth.nextScheduledRun).toLocaleDateString()}
        </div>
      {/if}
    </div>
  </div>

  <!-- Recent Content -->
  <div data-testid="content-feed-section" class="card bg-base-200 rounded-xl p-4">
    <h2 class="text-sm font-semibold text-base-content/70 uppercase tracking-wide mb-3">Recent Content</h2>
    {#if (data.recentContent ?? []).length === 0}
      <p class="text-sm text-base-content/50 text-center py-4">No content yet.</p>
    {:else}
      <div class="space-y-3">
        {#each data.recentContent ?? [] as item (item.id)}
          <FeedCard
            content={{
              id: item.id,
              title: item.title,
              body: item.body as { html: string; text?: string },
              tags: item.tags,
              status: item.status,
              content_type: item.content_type,
              created_at: item.created_at,
              updated_at: item.updated_at,
              meta_description: item.meta_description,
              project: item.projects ? { name: item.projects.name, color: item.projects.color ?? '#888' } : undefined
            }}
            showProjectBadge={true}
            expanded={expandedId === item.id}
            onExpand={(id) => { expandedId = id; }}
            onCollapse={() => { expandedId = null; }}
            onApprove={handleApprove}
            onReject={(id) => handleReject(id)}
            onSave={async (updates) => handleSave(item.id, updates)}
          />
        {/each}
      </div>
    {/if}
  </div>
</div>
