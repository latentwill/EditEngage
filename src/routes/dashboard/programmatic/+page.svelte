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
    <h1 class="text-2xl font-bold text-base-content">Programmatic SEO Templates</h1>
    <a
      href="/dashboard/programmatic/new"
      class="btn btn-primary btn-sm"
    >
      + New Template
    </a>
  </div>

  <div class="space-y-2">
    {#each data.templates as template}
      <a
        href="/dashboard/programmatic/{template.id}"
        data-testid="template-item"
        class="block card bg-base-200 hover:bg-base-300 transition-all p-4"
      >
        <div class="flex items-center justify-between">
          <div class="flex flex-col gap-1">
            <span class="text-sm font-medium text-base-content">{template.name}</span>
            <span class="text-xs text-base-content/40 font-mono">{template.slug_pattern}</span>
          </div>
          <div class="flex items-center gap-4">
            <span class="text-xs text-base-content/40">{template.data_source.row_count} rows</span>
            <span class="text-xs text-base-content/40">
              {new Date(template.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </a>
    {/each}

    {#if data.templates.length === 0}
      <div class="py-8 text-center text-sm text-base-content/40">
        No templates yet. Create your first programmatic SEO template.
      </div>
    {/if}
  </div>
</div>
