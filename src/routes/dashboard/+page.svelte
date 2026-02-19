<script lang="ts">
  import StatCard from '$lib/components/StatCard.svelte';

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
    };
  } = $props();

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
</div>
