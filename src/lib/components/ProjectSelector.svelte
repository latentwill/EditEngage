<script lang="ts">
  import { createProjectStore } from '$lib/stores/projectStore';
  import type { ProjectRow } from '$lib/stores/projectStore';

  const store = createProjectStore();

  let isOpen = $state(false);
  let searchTerm = $state('');

  let displayProjects = $derived.by(() => {
    if (searchTerm.length > 0) {
      return store.searchProjects(searchTerm);
    }
    return store.projects;
  });

  let favoriteProjects = $derived(
    displayProjects.filter((p: ProjectRow) => store.favoriteProjectIds.includes(p.id))
  );

  let allProjects = $derived(displayProjects);

  function toggleDropdown() {
    isOpen = !isOpen;
    if (!isOpen) {
      searchTerm = '';
    }
  }

  function handleSelect(projectId: string) {
    store.selectProject(projectId);
    isOpen = false;
    searchTerm = '';
  }

  function handleFavoriteClick(event: MouseEvent, projectId: string) {
    event.stopPropagation();
    store.toggleFavorite(projectId);
  }

  function handleSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;
    searchTerm = target.value;
  }

  function collectFocusable(dropdown: HTMLElement | null): HTMLElement[] {
    if (!dropdown) return [];
    return Array.from(
      dropdown.querySelectorAll<HTMLElement>('[data-testid^="project-option-"]')
    );
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const dropdown = document.querySelector('[data-testid="project-selector-dropdown"]') as HTMLElement;
      const items = collectFocusable(dropdown);
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);
      const nextIndex = currentIndex + 1;
      if (nextIndex < items.length) {
        items[nextIndex].focus();
      } else if (currentIndex === -1 && items.length > 0) {
        items[0].focus();
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const dropdown = document.querySelector('[data-testid="project-selector-dropdown"]') as HTMLElement;
      const items = collectFocusable(dropdown);
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);
      if (currentIndex > 0) {
        items[currentIndex - 1].focus();
      }
    } else if (event.key === 'Enter') {
      const el = document.activeElement as HTMLElement;
      const testId = el?.getAttribute('data-testid');
      if (testId === 'project-option-all') {
        handleSelect('all');
      } else if (testId?.startsWith('project-option-')) {
        const projectId = testId.replace('project-option-', '');
        handleSelect(projectId);
      }
    } else if (event.key === 'Escape') {
      isOpen = false;
      searchTerm = '';
    }
  }

  function handleRowKeyDown(event: KeyboardEvent, projectId: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(projectId);
    }
  }

  const selectedLabel = $derived.by(() => {
    if (store.selectedProjectId === 'all') return 'All Projects';
    const project = store.projects.find((p: ProjectRow) => p.id === store.selectedProjectId);
    return project?.name ?? 'All Projects';
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_role_has_required_aria_props -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<div class="relative" role="combobox" aria-expanded={isOpen} aria-haspopup="listbox" aria-controls="project-selector-listbox" onkeydown={handleKeyDown}>
  <button
    data-testid="project-selector-trigger"
    class="btn btn-sm btn-ghost gap-2"
    onclick={toggleDropdown}
    aria-label="Select project"
  >
    <span>{selectedLabel}</span>
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
  </button>

  {#if isOpen}
    <div
      data-testid="project-selector-dropdown"
      id="project-selector-listbox"
      role="listbox"
      aria-label="Project list"
      class="absolute top-full left-0 mt-1 w-72 bg-base-200 border border-base-300 rounded-lg shadow-xl z-50 overflow-hidden"
    >
      <!-- All Projects pinned at top -->
      <button
        data-testid="project-option-all"
        class="w-full text-left px-3 py-2 hover:bg-base-300 flex items-center gap-2 font-medium border-b border-base-300"
        tabindex={0}
        onclick={() => handleSelect('all')}
      >
        All Projects
      </button>

      <!-- Search -->
      <div class="px-3 py-2 border-b border-base-300">
        <input
          data-testid="project-search-input"
          type="text"
          placeholder="Search projects..."
          class="input input-sm input-bordered w-full"
          value={searchTerm}
          oninput={handleSearchInput}
        />
      </div>

      <!-- Favorites Section -->
      {#if favoriteProjects.length > 0 && searchTerm.length === 0}
        <div data-testid="favorites-section-header" class="px-3 pt-2 pb-1 text-xs font-semibold text-base-content/50 uppercase tracking-wider">
          FAVORITES
        </div>
        {#each favoriteProjects as project (project.id)}
          <div
            data-testid="project-option-{project.id}"
            class="w-full text-left px-3 py-1.5 hover:bg-base-300 flex items-center gap-2 cursor-pointer"
            tabindex={0}
            role="option"
            aria-selected={store.selectedProjectId === project.id}
            onclick={() => handleSelect(project.id)}
            onkeydown={(e: KeyboardEvent) => handleRowKeyDown(e, project.id)}
          >
            <span
              data-testid="project-color-dot"
              class="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style="background-color: {project.color ?? '#666'}"
            ></span>
            <span data-testid="project-name" class="text-sm font-medium">{project.name}</span>
            <span data-testid="project-domain" class="text-xs text-base-content/50 ml-auto mr-2">{project.domain ?? ''}</span>
            <button
              data-testid="favorite-toggle-{project.id}"
              class="text-warning hover:text-warning/80"
              aria-label="Toggle favorite for {project.name}"
              onclick={(e: MouseEvent) => handleFavoriteClick(e, project.id)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </button>
          </div>
        {/each}
      {/if}

      <!-- All Projects Section -->
      <div data-testid="all-projects-section-header" class="px-3 pt-2 pb-1 text-xs font-semibold text-base-content/50 uppercase tracking-wider">
        ALL PROJECTS
      </div>
      {#each searchTerm.length > 0 ? displayProjects : allProjects as project (project.id)}
        {#if searchTerm.length > 0 || !store.favoriteProjectIds.includes(project.id)}
          <div
            data-testid="project-option-{project.id}"
            class="w-full text-left px-3 py-1.5 hover:bg-base-300 flex items-center gap-2 cursor-pointer"
            tabindex={0}
            role="option"
            aria-selected={store.selectedProjectId === project.id}
            onclick={() => handleSelect(project.id)}
            onkeydown={(e: KeyboardEvent) => handleRowKeyDown(e, project.id)}
          >
            <span
              data-testid="project-color-dot"
              class="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style="background-color: {project.color ?? '#666'}"
            ></span>
            <span data-testid="project-name" class="text-sm font-medium">{project.name}</span>
            <span data-testid="project-domain" class="text-xs text-base-content/50 ml-auto mr-2">{project.domain ?? ''}</span>
            <button
              data-testid="favorite-toggle-{project.id}"
              class="text-base-content/30 hover:text-warning"
              aria-label="Toggle favorite for {project.name}"
              onclick={(e: MouseEvent) => handleFavoriteClick(e, project.id)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </button>
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</div>
