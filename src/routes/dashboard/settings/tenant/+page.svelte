<script lang="ts">
  import type { TenantType } from '$lib/types/tenant';

  interface OrgData {
    id: string;
    name: string;
    vocabulary_labels: Record<string, string | undefined>;
    default_writing_style_preset: string | null;
    default_destination_types: string[];
    ui_theme: Record<string, string | undefined>;
    enabled_modules: string[];
    tenant_type: TenantType;
  }

  interface PageData {
    org: OrgData | null;
    role?: string;
  }

  let { data }: { data: PageData } = $props();

  // Extract initial values from props for form state (intentional one-time capture)
  const org: OrgData | null = data.org;
  const orgId: string = org?.id ?? '';

  let tenantType = $state(org?.tenant_type ?? 'content');
  let enabledModules = $state<string[]>(org?.enabled_modules ?? ['research', 'writing', 'publish']);
  let vocabularyLabels = $state<Record<string, string>>({
    topics: org?.vocabulary_labels?.topics ?? '',
    research: org?.vocabulary_labels?.research ?? '',
    content: org?.vocabulary_labels?.content ?? '',
    publish: org?.vocabulary_labels?.publish ?? '',
    agents: org?.vocabulary_labels?.agents ?? ''
  });
  let destinationTypes = $state<string[]>(org?.default_destination_types ?? ['ghost']);
  let uiTheme = $state({
    primary_color: org?.ui_theme?.primary_color ?? '#6366f1',
    accent_color: org?.ui_theme?.accent_color ?? '#f59e0b',
    logo_url: org?.ui_theme?.logo_url ?? ''
  });

  let saving = $state(false);
  let saveMessage = $state('');
  let saveError = $state(false);

  function toggleModule(mod: string) {
    if (enabledModules.includes(mod)) {
      enabledModules = enabledModules.filter(m => m !== mod);
    } else {
      enabledModules = [...enabledModules, mod];
    }
  }

  function toggleDestination(dest: string) {
    if (destinationTypes.includes(dest)) {
      destinationTypes = destinationTypes.filter(d => d !== dest);
    } else {
      destinationTypes = [...destinationTypes, dest];
    }
  }

  async function handleSave() {
    if (!org) return;
    saving = true;
    saveMessage = '';
    saveError = false;

    try {
      const body = {
        tenant_type: tenantType,
        enabled_modules: enabledModules,
        vocabulary_labels: vocabularyLabels,
        default_destination_types: destinationTypes,
        ui_theme: uiTheme
      };

      const res = await fetch(`/api/v1/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        saveMessage = 'Settings saved successfully.';
        saveError = false;
      } else {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        saveMessage = err.error ?? 'Save failed';
        saveError = true;
      }
    } catch {
      saveMessage = 'Network error. Please try again.';
      saveError = true;
    } finally {
      saving = false;
    }
  }
</script>

<div data-testid="tenant-config-page" class="py-6">
  <h1 class="text-2xl font-bold text-base-content mb-6">Tenant Configuration</h1>

  {#if !org}
    <div class="card bg-base-200 p-6">
      <p class="text-base-content/60">No organization found. Please join or create an organization first.</p>
    </div>
  {:else}
    <!-- Tenant Type -->
    <div class="card bg-base-200 p-6 mb-6">
      <h2 class="text-lg font-semibold text-base-content mb-4">Tenant Type</h2>
      <select
        data-testid="tenant-type-select"
        class="select select-bordered w-full max-w-xs"
        bind:value={tenantType}
      >
        <option value="content">Content Team</option>
        <option value="research">Research Team</option>
        <option value="enterprise">Enterprise</option>
      </select>
    </div>

    <!-- Module Visibility -->
    <div class="card bg-base-200 p-6 mb-6">
      <h2 class="text-lg font-semibold text-base-content mb-4">Module Visibility</h2>
      <div class="flex flex-col gap-3">
        {#each ['research', 'writing', 'publish'] as mod}
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-testid={`module-${mod}`}
              class="checkbox checkbox-primary"
              checked={enabledModules.includes(mod)}
              onchange={() => toggleModule(mod)}
            />
            <span class="text-base-content capitalize">{mod}</span>
          </label>
        {/each}
      </div>
    </div>

    <!-- Vocabulary Labels -->
    <div class="card bg-base-200 p-6 mb-6">
      <h2 class="text-lg font-semibold text-base-content mb-4">Vocabulary Labels</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each Object.keys(vocabularyLabels) as key}
          <div class="form-control">
            <label class="label" for={`vocab-${key}`}>
              <span class="label-text capitalize">{key}</span>
            </label>
            <input
              id={`vocab-${key}`}
              type="text"
              data-testid={`vocab-${key}`}
              class="input input-bordered"
              placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
              bind:value={vocabularyLabels[key]}
            />
          </div>
        {/each}
      </div>
    </div>

    <!-- Default Destination Types -->
    <div class="card bg-base-200 p-6 mb-6">
      <h2 class="text-lg font-semibold text-base-content mb-4">Default Destination Types</h2>
      <div class="flex flex-col gap-3">
        {#each ['ghost', 'postbridge', 'webhook'] as dest}
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-testid={`dest-${dest}`}
              class="checkbox checkbox-primary"
              checked={destinationTypes.includes(dest)}
              onchange={() => toggleDestination(dest)}
            />
            <span class="text-base-content capitalize">{dest}</span>
          </label>
        {/each}
      </div>
    </div>

    <!-- UI Theme -->
    <div class="card bg-base-200 p-6 mb-6">
      <h2 class="text-lg font-semibold text-base-content mb-4">UI Theme</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="form-control">
          <label class="label" for="primary-color">
            <span class="label-text">Primary Color</span>
          </label>
          <input
            id="primary-color"
            type="color"
            data-testid="theme-primary-color"
            class="input input-bordered h-12 w-20 p-1"
            bind:value={uiTheme.primary_color}
          />
        </div>
        <div class="form-control">
          <label class="label" for="accent-color">
            <span class="label-text">Accent Color</span>
          </label>
          <input
            id="accent-color"
            type="color"
            data-testid="theme-accent-color"
            class="input input-bordered h-12 w-20 p-1"
            bind:value={uiTheme.accent_color}
          />
        </div>
        <div class="form-control md:col-span-2">
          <label class="label" for="logo-url">
            <span class="label-text">Logo URL</span>
          </label>
          <input
            id="logo-url"
            type="url"
            data-testid="theme-logo-url"
            class="input input-bordered"
            placeholder="https://example.com/logo.png"
            bind:value={uiTheme.logo_url}
          />
        </div>
      </div>
    </div>

    <!-- Save Button -->
    <div class="flex items-center gap-4">
      <button
        data-testid="save-tenant-config"
        class="btn btn-primary"
        disabled={saving}
        onclick={handleSave}
      >
        {#if saving}
          <span class="loading loading-spinner loading-sm"></span>
          Saving...
        {:else}
          Save Configuration
        {/if}
      </button>

      {#if saveMessage}
        <span
          data-testid="save-message"
          class={saveError ? 'text-error' : 'text-success'}
        >
          {saveMessage}
        </span>
      {/if}
    </div>
  {/if}
</div>
