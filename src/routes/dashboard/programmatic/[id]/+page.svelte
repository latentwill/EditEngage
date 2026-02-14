<script lang="ts">
  type DataSource = {
    columns: string[];
    rows: Record<string, string>[];
    row_count: number;
  };

  type Template = {
    id: string;
    name: string;
    slug_pattern: string;
    body_template: string;
    variables: string[];
    data_source: DataSource;
  };

  let { data }: {
    data: {
      template: Template | null;
      mode: 'create' | 'edit';
    };
  } = $props();

  let name = $state(data.template?.name ?? '');
  let slugPattern = $state(data.template?.slug_pattern ?? '');
  let bodyTemplate = $state(data.template?.body_template ?? '');
  let variables = $state<string[]>(data.template?.variables ?? []);
  let dataSource = $state<DataSource | null>(data.template?.data_source ?? null);
  let slugError = $state('');
  let showPreview = $state(false);

  const slugPlaceholder = 'e.g. /best-{service}-in-{city}';
  const bodyPlaceholder = '<h1>Best {service} in {city}</h1><p>{description}</p>';
  const slugErrorMessage = 'Slug pattern must contain at least one variable in {curly braces}';

  function validateSlugPattern(pattern: string): boolean {
    return /\{[a-zA-Z_][a-zA-Z0-9_]*\}/.test(pattern);
  }

  function substituteVariables(template: string, row: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(row)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return result;
  }

  function handleCsvUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.trim().split('\n');
      if (lines.length === 0) return;

      const headers = lines[0].split(',').map(h => h.trim());
      const rows: Record<string, string>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] ?? '';
        });
        rows.push(row);
      }

      variables = headers;
      dataSource = {
        columns: headers,
        rows,
        row_count: rows.length
      };
    };
    reader.readAsText(file);
  }

  function handlePreview() {
    showPreview = true;
  }

  async function handleSave() {
    slugError = '';

    if (!validateSlugPattern(slugPattern)) {
      slugError = slugErrorMessage;
      return;
    }

    const payload = {
      name,
      slug_pattern: slugPattern,
      body_template: bodyTemplate,
      variables,
      data_source: dataSource ? {
        columns: dataSource.columns,
        rows: dataSource.rows,
        row_count: dataSource.row_count
      } : undefined
    };

    await fetch('/api/v1/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  function sanitizeHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/on\w+\s*=\s*'[^']*'/gi, '')
      .replace(/javascript:/gi, '');
  }

  let previewHtml = $derived(
    dataSource?.rows?.[0]
      ? substituteVariables(bodyTemplate, dataSource.rows[0])
      : bodyTemplate
  );
</script>

<div data-testid="template-form-page" class="space-y-8 py-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-white">
      {data.mode === 'create' ? 'Create Template' : 'Edit Template'}
    </h1>
  </div>

  <div class="backdrop-blur-[20px] bg-[var(--glass-bg,rgba(255,255,255,0.08))] border border-[var(--glass-border,rgba(255,255,255,0.08))] rounded-xl p-6 space-y-6">
    <div>
      <label for="template-name" class="block text-sm text-white/70 mb-1">Template Name</label>
      <input
        id="template-name"
        type="text"
        bind:value={name}
        class="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/80"
        placeholder="e.g. City Landing Pages"
      />
    </div>

    <div>
      <label for="slug-pattern" class="block text-sm text-white/70 mb-1">Slug Pattern</label>
      <input
        id="slug-pattern"
        type="text"
        bind:value={slugPattern}
        class="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/80 font-mono"
        placeholder={slugPlaceholder}
      />
      {#if slugError}
        <p class="text-xs text-red-400 mt-1">{slugError}</p>
      {/if}
    </div>

    <div>
      <label for="body-template" class="block text-sm text-white/70 mb-1">Body Template</label>
      <textarea
        id="body-template"
        bind:value={bodyTemplate}
        rows="8"
        class="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white/80 font-mono"
        placeholder={bodyPlaceholder}
      ></textarea>
    </div>

    <div>
      <label for="csv-upload" class="block text-sm text-white/70 mb-1">Data Source (CSV)</label>
      <input
        id="csv-upload"
        data-testid="csv-upload"
        type="file"
        accept=".csv"
        onchange={handleCsvUpload}
        class="text-sm text-white/60"
      />
    </div>

    {#if variables.length > 0}
      <div>
        <span class="block text-sm text-white/70 mb-1">Detected Variables</span>
        <div class="flex flex-wrap gap-2">
          {#each variables as variable}
            <span
              data-testid="variable-tag"
              class="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-400"
            >
              {variable}
            </span>
          {/each}
        </div>
      </div>
    {/if}

    <div class="flex items-center gap-3">
      <button
        onclick={handlePreview}
        class="px-4 py-2 rounded-lg bg-white/[0.06] text-white/70 hover:bg-white/[0.12] transition-colors"
      >
        Preview
      </button>
      <button
        onclick={handleSave}
        class="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
      >
        Save Template
      </button>
    </div>
  </div>

  {#if showPreview}
    <div
      data-testid="template-preview"
      class="backdrop-blur-[20px] bg-[var(--glass-bg,rgba(255,255,255,0.08))] border border-[var(--glass-border,rgba(255,255,255,0.08))] rounded-xl p-6"
    >
      <h2 class="text-sm font-semibold text-white/70 uppercase tracking-wide mb-3">Preview</h2>
      <div class="prose prose-invert text-sm">
        {@html sanitizeHtml(previewHtml)}
      </div>
    </div>
  {/if}
</div>
