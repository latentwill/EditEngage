<script lang="ts">
  import ResearchBriefView from '$lib/components/ResearchBriefView.svelte';

  interface BriefSource {
    url: string;
    title: string;
  }

  interface BriefFinding {
    provider: string;
    content: string;
    sources: BriefSource[];
  }

  interface Brief {
    id: string;
    query_id: string;
    summary: string;
    findings: BriefFinding[];
    created_at: string;
  }

  interface ProviderChainEntry {
    provider: string;
    role: string;
  }

  interface ResearchQuery {
    id: string;
    project_id: string;
    name: string;
    prompt_template: string;
    provider_chain: ProviderChainEntry[];
    synthesis_mode: string;
    auto_generate_topics: boolean;
    schedule: string;
    pipeline_id: string | null;
    status: string;
    last_run_at: string | null;
    brief_count: number;
    created_at: string;
    updated_at: string;
  }

  let { data }: {
    data: {
      query: ResearchQuery;
      briefs: Brief[];
      pipelineName: string | null;
    };
  } = $props();
</script>

<div data-testid="research-detail-page" class="space-y-8 py-6 max-w-4xl mx-auto">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <a data-testid="detail-back-btn" href="/dashboard/research" class="btn btn-ghost btn-sm">
        &larr; Back to Research
      </a>
    </div>
  </div>

  <div class="flex items-center justify-between">
    <h1 data-testid="detail-query-name" class="text-2xl font-bold text-base-content">{data.query.name}</h1>
    <span data-testid="detail-query-status" class="badge badge-outline">{data.query.status}</span>
  </div>

  <!-- Configuration -->
  <div data-testid="detail-config" class="card bg-base-200 shadow-sm">
    <div class="card-body space-y-3">
      <h2 class="card-title text-lg">Configuration</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <span class="text-xs text-base-content/50 uppercase tracking-wide">Prompt</span>
          <p data-testid="detail-prompt" class="text-base-content">{data.query.prompt_template}</p>
        </div>

        <div>
          <span class="text-xs text-base-content/50 uppercase tracking-wide">Providers</span>
          <div data-testid="detail-providers" class="flex flex-wrap gap-1 mt-1">
            {#each data.query.provider_chain as entry}
              <span class="badge badge-sm badge-primary">{entry.provider}</span>
            {/each}
          </div>
        </div>

        <div>
          <span class="text-xs text-base-content/50 uppercase tracking-wide">Schedule</span>
          <p data-testid="detail-schedule" class="text-base-content">{data.query.schedule}</p>
        </div>

        <div>
          <span class="text-xs text-base-content/50 uppercase tracking-wide">Pipeline</span>
          <p data-testid="detail-pipeline" class="text-base-content">
            {data.pipelineName ?? 'None'}
          </p>
        </div>

        <div>
          <span class="text-xs text-base-content/50 uppercase tracking-wide">Synthesis</span>
          <p data-testid="detail-synthesis" class="text-base-content">{data.query.synthesis_mode}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Briefs -->
  <div data-testid="detail-briefs-section" class="space-y-4">
    <h2 data-testid="detail-brief-count" class="text-lg font-semibold text-base-content">
      Briefs ({data.briefs.length})
    </h2>

    {#each data.briefs as brief (brief.id)}
      <ResearchBriefView {brief} />
    {/each}

    {#if data.briefs.length === 0}
      <p class="text-sm text-base-content/50">No briefs generated yet.</p>
    {/if}
  </div>
</div>
