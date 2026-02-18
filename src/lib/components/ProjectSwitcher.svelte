<script lang="ts">
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

<div class="relative">
  <button
    data-testid="project-switcher-trigger"
    onclick={toggle}
    class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] transition-all duration-300 text-sm text-white/80 hover:text-white"
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
      class="absolute top-full left-0 mt-1 w-56 backdrop-blur-[20px] bg-[var(--glass-bg,rgba(255,255,255,0.08))] border border-[var(--glass-border,rgba(255,255,255,0.08))] rounded-xl shadow-lg overflow-hidden z-50"
    >
      {#if showSearch}
        <div class="p-2 border-b border-white/[0.08]">
          <input
            data-testid="project-search"
            type="text"
            placeholder="Search projects..."
            bind:value={search}
            class="w-full px-2 py-1 bg-white/[0.06] border border-white/[0.08] rounded-md text-sm text-white placeholder:text-white/40 outline-none focus:border-white/[0.20]"
          />
        </div>
      {/if}
      <div class="py-1 max-h-60 overflow-y-auto">
        {#each filtered as project}
          <button
            onclick={() => selectProject(project)}
            class="w-full text-left px-3 py-2 text-sm transition-all duration-200 {displaySelected?.id === project.id ? 'text-white bg-white/[0.12]' : 'text-white/70 hover:text-white hover:bg-white/[0.06]'}"
          >
            {project.name}
          </button>
        {/each}
      </div>
      <div class="border-t border-white/[0.08] p-2">
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
              class="w-full px-2 py-1 bg-white/[0.06] border border-white/[0.08] rounded-md text-sm text-white placeholder:text-white/40 outline-none focus:border-white/[0.20]"
            />
            <button
              data-testid="new-project-submit-btn"
              type="submit"
              class="w-full px-2 py-1 bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] rounded-md text-sm text-white/80 hover:text-white transition-all duration-200"
            >
              Create
            </button>
          </form>
        {:else}
          <button
            data-testid="new-project-btn"
            onclick={toggleCreateForm}
            class="w-full text-left px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/[0.06] rounded-md transition-all duration-200 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Project
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>
