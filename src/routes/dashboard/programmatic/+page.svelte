<script lang="ts">
  type Template = {
    id: string;
    project_id: string;
    name: string;
    slug_pattern: string;
    body_template: string;
    variables: string[];
    data_source: {
      columns: string[];
      row_count: number;
    };
    created_at: string;
    updated_at: string;
  };

  let { data }: {
    data: {
      templates: Template[];
    };
  } = $props();
</script>

<div data-testid="programmatic-page" class="space-y-8 py-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-white">Programmatic SEO Templates</h1>
    <a
      href="/dashboard/programmatic/new"
      class="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
    >
      + New Template
    </a>
  </div>

  <div class="space-y-2">
    {#each data.templates as template}
      <a
        href="/dashboard/programmatic/{template.id}"
        data-testid="template-item"
        class="block backdrop-blur-[20px] bg-[var(--glass-bg,rgba(255,255,255,0.08))] border border-[var(--glass-border,rgba(255,255,255,0.08))] rounded-xl p-4 hover:bg-white/[0.12] transition-all duration-300"
      >
        <div class="flex items-center justify-between">
          <div class="flex flex-col gap-1">
            <span class="text-sm font-medium text-white">{template.name}</span>
            <span class="text-xs text-white/50 font-mono">{template.slug_pattern}</span>
          </div>
          <div class="flex items-center gap-4">
            <span class="text-xs text-white/40">{template.data_source.row_count} rows</span>
            <span class="text-xs text-white/40">
              {new Date(template.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </a>
    {/each}

    {#if data.templates.length === 0}
      <div class="py-8 text-center text-sm text-white/40">
        No templates yet. Create your first programmatic SEO template.
      </div>
    {/if}
  </div>
</div>
