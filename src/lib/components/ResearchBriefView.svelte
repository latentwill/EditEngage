<script lang="ts">
  import type { ResearchBrief, ResearchOutputType } from '$lib/types/research.js';

  let { brief }: { brief: ResearchBrief } = $props();

  let expanded = $state(false);
  let citationsExpanded = $state(false);

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function outputTypeBadgeClass(outputType: ResearchOutputType): string {
    const classMap: Record<ResearchOutputType, string> = {
      topic_candidate: 'badge-info',
      source_document: 'badge-primary',
      competitive_signal: 'badge-warning',
      data_point: 'badge-accent'
    };
    return classMap[outputType];
  }

  function formatRelevance(score: number): string {
    return `${Math.round(score * 100)}%`;
  }

  const hasCitations = $derived(brief.citations && brief.citations.length > 0);
</script>

<div data-testid="brief-card" class="card bg-base-200 shadow-sm">
  <div class="card-body p-4">
    <div class="flex items-center justify-between">
      <span class="text-xs text-base-content/50">{formatDate(brief.created_at)}</span>
      {#if brief.output_type}
        <span data-testid="brief-output-type" class="badge badge-sm {outputTypeBadgeClass(brief.output_type)}">{brief.output_type}</span>
      {/if}
    </div>
    <p data-testid="brief-summary" class="text-sm text-base-content">{brief.summary ?? ''}</p>

    <div class="flex gap-2">
      <button
        data-testid="brief-expand-btn"
        class="btn btn-ghost btn-xs self-start"
        onclick={() => expanded = !expanded}
      >
        {expanded ? 'Collapse' : 'Expand findings'}
      </button>

      {#if hasCitations}
        <button
          data-testid="brief-citations-btn"
          class="btn btn-ghost btn-xs self-start"
          onclick={() => citationsExpanded = !citationsExpanded}
        >
          {citationsExpanded ? 'Hide citations' : 'Show citations'}
        </button>
      {/if}
    </div>

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

    {#if citationsExpanded && brief.citations}
      <div data-testid="brief-citations" class="space-y-3 mt-2 border-t border-base-300 pt-4">
        {#each brief.citations as citation}
          <div class="flex items-start gap-3 text-sm">
            <div class="flex-1 space-y-1">
              <a
                data-testid="citation-link"
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                class="link link-primary text-sm font-medium"
              >
                {citation.title}
              </a>
              <div class="flex items-center gap-3 text-xs text-base-content/50">
                <span class="badge badge-xs badge-outline">{citation.provider}</span>
                {#if citation.date}
                  <span data-testid="citation-date">{formatDate(citation.date)}</span>
                {/if}
                {#if citation.relevance_score != null}
                  <span data-testid="citation-relevance">{formatRelevance(citation.relevance_score)}</span>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
