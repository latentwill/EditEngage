<script lang="ts">
  import type { Database } from '$lib/types/database.js';
  type Project = Database['public']['Tables']['projects']['Row'];

  let { data }: { data: { project: Project | null; projectId: string } } = $props();

  let name = $state(data.project?.name ?? '');
  let description = $state(data.project?.description ?? '');
  let domain = $state(data.project?.domain ?? '');
  let color = $state(data.project?.color ?? '#000000');
  let saving = $state(false);
  let saveSuccess = $state(false);
  let saveError = $state('');

  async function handleSave() {
    if (!data.project) return;
    saving = true;
    saveError = '';
    saveSuccess = false;

    try {
      const res = await fetch(`/api/v1/projects/${data.projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, domain, color }),
      });

      if (res.ok) {
        saveSuccess = true;
        setTimeout(() => { saveSuccess = false; }, 2000);
      } else {
        const result = await res.json();
        saveError = result.error ?? 'Failed to save settings';
      }
    } catch {
      saveError = 'Network error';
    } finally {
      saving = false;
    }
  }
</script>

<div data-testid="settings-page" class="space-y-8 py-6">
  <h1 class="text-2xl font-bold text-base-content">General Settings</h1>

  {#if !data.project}
    <div class="card bg-base-200 p-6">
      <p class="text-base-content/60">No project selected.</p>
    </div>
  {:else}
    <form
      class="card bg-base-200 shadow-xl p-6 space-y-4"
      onsubmit={(e) => { e.preventDefault(); handleSave(); }}
    >
      <div>
        <label class="block text-sm text-base-content/80 mb-1" for="settings-project-name">Project Name</label>
        <input
          id="settings-project-name"
          type="text"
          class="input input-bordered w-full"
          bind:value={name}
        />
      </div>

      <div>
        <label class="block text-sm text-base-content/80 mb-1" for="settings-description">Description</label>
        <textarea
          id="settings-description"
          class="textarea textarea-bordered w-full resize-none"
          rows="3"
          bind:value={description}
        ></textarea>
      </div>

      <div>
        <label class="block text-sm text-base-content/80 mb-1" for="settings-domain">Domain</label>
        <input
          id="settings-domain"
          type="text"
          class="input input-bordered w-full"
          placeholder="example.com"
          bind:value={domain}
        />
      </div>

      <div>
        <label class="block text-sm text-base-content/80 mb-1" for="settings-color">Color</label>
        <input
          id="settings-color"
          type="color"
          class="w-12 h-10 rounded cursor-pointer"
          bind:value={color}
        />
      </div>

      {#if saveError}
        <p class="text-error text-sm">{saveError}</p>
      {/if}

      {#if saveSuccess}
        <p class="text-success text-sm">Saved!</p>
      {/if}

      <div>
        <button type="submit" class="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>

    <!-- Danger Zone -->
    <section data-testid="danger-zone" class="card bg-base-200 shadow-xl p-6 border border-error/30">
      <h2 class="text-lg font-semibold text-error mb-2">Danger Zone</h2>
      <p class="text-sm text-base-content/60 mb-4">
        Permanently delete this project and all its data. This action cannot be undone.
      </p>
      <button class="btn btn-error btn-sm" disabled>Delete Project</button>
    </section>
  {/if}
</div>
