<script lang="ts">
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
    summary: string;
    findings: BriefFinding[];
    created_at: string;
  }

  let { brief }: { brief: Brief } = $props();

  let expanded = $state(false);

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
</script>

<div data-testid="brief-card" class="card bg-base-200 shadow-sm">
  <div class="card-body p-4">
    <div class="flex items-center justify-between">
      <span class="text-xs text-base-content/50">{formatDate(brief.created_at)}</span>
    </div>
    <p data-testid="brief-summary" class="text-sm text-base-content">{brief.summary}</p>
    <button
      data-testid="brief-expand-btn"
      class="btn btn-ghost btn-xs self-start"
      onclick={() => expanded = !expanded}
    >
      {expanded ? 'Collapse' : 'Expand findings'}
    </button>

    {#if expanded}
      <div data-testid="brief-findings" class="space-y-4 mt-2 border-t border-base-300 pt-4">
        {#each brief.findings as finding}
          <div class="space-y-2">
            <span class="badge badge-sm badge-outline">{finding.provider}</span>
            <p class="text-sm text-base-content/80">{finding.content}</p>
            {#if finding.sources.length > 0}
              <div class="flex flex-wrap gap-2">
                {#each finding.sources as source}
                  <a
                    data-testid="brief-source-link"
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="link link-primary text-xs"
                  >
                    {source.title}
                  </a>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
