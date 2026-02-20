<script lang="ts">
  import { onMount } from 'svelte';
  import { setActiveProject, type ProjectInfo } from '$lib/stores/project';

  let {
    projects = [],
    orgId,
    onprojectChanged
  }: {
    projects: ProjectInfo[];
    orgId?: string;
    onprojectChanged?: (project: ProjectInfo) => void;
  } = $props();

  // Dropdown state
  let open = $state(false);
  let containerEl: HTMLDivElement;
  let search = $state('');
  let selected = $state<ProjectInfo | null>(null);

  // Modal state
  let modalOpen = $state(false);
  let newProjectName = $state('');
  let submitting = $state(false);
  let createError = $state('');
  let dialogEl = $state<HTMLDialogElement | undefined>(undefined);

  onMount(() => {
    function handleClickOutside(e: MouseEvent) {
      if (open && containerEl && !containerEl.contains(e.target as Node)) {
        open = false;
        search = '';
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });

  const firstProject = $derived(projects[0] ?? null);
  const displaySelected = $derived(selected ?? firstProject);
  const showSearch = $derived(projects.length > 5);
  const filtered = $derived(
    search
      ? projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
      : projects
  );

  function toggle() {
    open = !open;
    if (!open) search = '';
  }

  function selectProject(project: ProjectInfo) {
    selected = project;
    setActiveProject(project);
    open = false;
    search = '';
    onprojectChanged?.(project);
  }

  function openCreateModal() {
    open = false;
    search = '';
    newProjectName = '';
    createError = '';
    modalOpen = true;
    setTimeout(() => { try { dialogEl?.showModal(); } catch { /* jsdom */ } }, 0);
  }

  function closeCreateModal() {
    modalOpen = false;
    try { dialogEl?.close(); } catch { /* jsdom */ }
    newProjectName = '';
    createError = '';
    submitting = false;
  }

  async function submitNewProject() {
    if (!newProjectName.trim()) return;

    if (!orgId) {
      createError = 'No organisation found. Please refresh and try again.';
      return;
    }

    submitting = true;
    createError = '';

    try {
      const res = await fetch('/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, name: newProjectName.trim() })
      });

      if (res.ok) {
        const { data } = await res.json();
        const newProject: ProjectInfo = {
          id: data.id,
          name: data.name,
          icon: data.icon ?? null,
          color: data.color ?? null
        };
        projects = [...projects, newProject];
        selectProject(newProject);
        closeCreateModal();
      } else {
        createError = 'Failed to create project. Please try again.';
      }
    } catch {
      createError = 'Network error. Please try again.';
    } finally {
      submitting = false;
    }
  }
</script>

<div bind:this={containerEl} class="dropdown relative">
  <button
    data-testid="project-switcher-trigger"
    onclick={toggle}
    class="btn btn-ghost btn-sm w-full justify-between"
  >
    <span class="truncate">
      {displaySelected ? displaySelected.name : 'Select project'}
    </span>
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  </button>

  {#if open}
    <ul
      data-testid="project-switcher-dropdown"
      class="absolute left-0 top-full z-50 mt-1 w-56 rounded-box bg-base-100 border border-base-300 shadow-xl menu menu-sm p-2"
    >
      {#if showSearch}
        <li class="mb-1">
          <div class="p-0">
            <input
              data-testid="project-search"
              type="text"
              placeholder="Search projects..."
              bind:value={search}
              class="input input-bordered input-sm w-full"
            />
          </div>
        </li>
      {/if}

      {#if filtered.length === 0}
        <li><span class="text-base-content/50 text-xs">No projects found</span></li>
      {:else}
        <div class="max-h-52 overflow-y-auto">
          {#each filtered as project}
            <li>
              <button
                onclick={() => selectProject(project)}
                class:active={displaySelected?.id === project.id}
              >
                {project.name}
              </button>
            </li>
          {/each}
        </div>
      {/if}

      <li class="border-t border-base-300 mt-1 pt-1">
        <button
          data-testid="new-project-btn"
          onclick={openCreateModal}
          class="text-primary"
        >
          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Project
        </button>
      </li>
    </ul>
  {/if}
</div>

<!-- New Project Modal — renders at component root, escapes sidebar overflow -->
{#if modalOpen}
  <dialog
    data-testid="new-project-modal"
    aria-labelledby="new-project-heading"
    bind:this={dialogEl}
    oncancel={(e) => { e.preventDefault(); closeCreateModal(); }}
    class="modal modal-bottom sm:modal-middle"
  >
    <div class="modal-box">
      <h3 id="new-project-heading" class="font-bold text-lg mb-4">New Project</h3>
      <form
        onsubmit={(e) => { e.preventDefault(); submitNewProject(); }}
        class="flex flex-col gap-3"
      >
        <!-- svelte-ignore a11y_autofocus -->
        <input
          data-testid="new-project-name-input"
          type="text"
          placeholder="Project name..."
          bind:value={newProjectName}
          class="input input-bordered w-full"
          maxlength="100"
          autofocus
        />
        {#if createError}
          <p data-testid="new-project-error" class="text-error text-sm">{createError}</p>
        {/if}
        <div class="modal-action mt-2">
          <button
            data-testid="new-project-cancel-btn"
            type="button"
            onclick={closeCreateModal}
            class="btn btn-ghost"
          >
            Cancel
          </button>
          <button
            data-testid="new-project-submit-btn"
            type="submit"
            disabled={submitting || !newProjectName.trim()}
            class="btn btn-primary"
          >
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button onclick={closeCreateModal}>close</button>
    </form>
  </dialog>
{/if}
