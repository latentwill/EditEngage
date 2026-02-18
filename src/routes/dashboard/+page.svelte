<script lang="ts">
  import StatCard from '$lib/components/StatCard.svelte';

  let { data }: {
    data: {
      totalContent: number;
      publishedThisWeek: number;
      pendingReview: number;
      activePipelines: number;
      recentPipelineRuns: Array<{
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
    completed: 'bg-emerald-500/20 text-emerald-400',
    running: 'bg-blue-500/20 text-blue-400',
    queued: 'bg-yellow-500/20 text-yellow-400',
    failed: 'bg-red-500/20 text-red-400'
  };
</script>

<div data-testid="dashboard-page" data-project-id={data.activeProjectId} class="space-y-8 py-6">
  <!-- Stat Cards -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard label="Total Content" value={String(data.totalContent)} />
    <StatCard label="Published This Week" value={String(data.publishedThisWeek)} />
    <StatCard label="Pending Review" value={String(data.pendingReview)} />
    <StatCard label="Active Circuits" value={String(data.activePipelines)} />
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Recent Pipeline Runs -->
    <div
      data-testid="recent-pipeline-runs"
      class="backdrop-blur-[20px] bg-[var(--glass-bg,rgba(255,255,255,0.08))] border border-[var(--glass-border,rgba(255,255,255,0.08))] rounded-xl p-4"
    >
      <h2 class="text-sm font-semibold text-white/70 uppercase tracking-wide mb-3">Recent Circuit Runs</h2>
      <div class="space-y-2">
        {#each data.recentPipelineRuns.slice(0, 5) as run}
          <div data-testid="pipeline-run-item" class="flex items-center justify-between py-2 border-b border-white/[0.06] last:border-0">
            <span class="text-sm text-white/80">{run.pipeline_name}</span>
            <span
              data-testid="run-status-badge"
              class="text-xs px-2 py-0.5 rounded-full {statusColors[run.status] ?? 'bg-white/10 text-white/60'}"
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
      class="backdrop-blur-[20px] bg-[var(--glass-bg,rgba(255,255,255,0.08))] border border-[var(--glass-border,rgba(255,255,255,0.08))] rounded-xl p-4"
    >
      <h2 class="text-sm font-semibold text-white/70 uppercase tracking-wide mb-3">Content Awaiting Review</h2>
      <div class="space-y-2">
        {#each data.contentInReview as item}
          <div data-testid="review-item" class="flex items-center justify-between py-2 border-b border-white/[0.06] last:border-0">
            <span class="text-sm text-white/80">{item.title}</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
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
    class="backdrop-blur-[20px] bg-[var(--glass-bg,rgba(255,255,255,0.08))] border border-[var(--glass-border,rgba(255,255,255,0.08))] rounded-xl p-4"
  >
    <h2 class="text-sm font-semibold text-white/70 uppercase tracking-wide mb-3">Topic Queue Health</h2>
    <div class="flex items-center gap-6">
      <div>
        <span class="text-2xl font-bold text-white">{data.topicQueueHealth.pendingCount}</span>
        <span class="text-xs text-white/50 ml-1">pending topics</span>
      </div>
      {#if data.topicQueueHealth.nextScheduledRun}
        <div class="text-sm text-white/60">
          Next run: {new Date(data.topicQueueHealth.nextScheduledRun).toLocaleDateString()}
        </div>
      {/if}
    </div>
  </div>
</div>
