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

  let open = $state(false);
  let containerEl: HTMLDivElement;

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
  let search = $state('');
  let selected = $state<ProjectInfo | null>(null);
  let creating = $state(false);
  let newProjectName = $state('');

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
    creating = false;
    newProjectName = '';
    onprojectChanged?.(project);
  }

  function toggleCreateForm() {
    creating = !creating;
    newProjectName = '';
  }

  async function submitNewProject() {
    if (!newProjectName.trim() || !orgId) return;

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
    }
  }
</script>

<div class="dropdown" bind:this={containerEl}>
  <button
    data-testid="project-switcher-trigger"
    onclick={toggle}
    class="btn btn-ghost btn-sm"
  >
    {#if displaySelected}
      <span>{displaySelected.name}</span>
    {:else}
      <span>Select project</span>
    {/if}
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  </button>

  {#if open}
    <div
      data-testid="project-switcher-dropdown"
      class="dropdown-content menu bg-base-200 rounded-box z-50 w-56 p-2 shadow-xl"
    >
      {#if showSearch}
        <li class="border-b border-base-300 pb-2 mb-1">
          <input
            data-testid="project-search"
            type="text"
            placeholder="Search projects..."
            bind:value={search}
            class="input input-bordered input-sm w-full"
          />
        </li>
      {/if}
      <div class="max-h-60 overflow-y-auto">
        {#each filtered as project}
          <li>
            <button
              onclick={() => selectProject(project)}
              class={displaySelected?.id === project.id ? 'active' : ''}
            >
              {project.name}
            </button>
          </li>
        {/each}
      </div>
      <li class="border-t border-base-300 pt-2 mt-1">
        {#if creating}
          <form
            data-testid="new-project-form"
            onsubmit={(e) => { e.preventDefault(); submitNewProject(); }}
            class="flex flex-col gap-2"
          >
            <input
              data-testid="new-project-name-input"
              type="text"
              placeholder="Project name..."
              bind:value={newProjectName}
              class="input input-bordered input-sm w-full"
            />
            <button
              data-testid="new-project-submit-btn"
              type="submit"
              class="btn btn-ghost btn-sm w-full"
            >
              Create
            </button>
          </form>
        {:else}
          <button
            data-testid="new-project-btn"
            onclick={toggleCreateForm}
            class="btn btn-ghost btn-sm w-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Project
          </button>
        {/if}
      </li>
    </div>
  {/if}
</div>
