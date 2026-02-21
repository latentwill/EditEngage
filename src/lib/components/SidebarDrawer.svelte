<script lang="ts">
  import type { Snippet } from 'svelte';
  import Sidebar from './Sidebar.svelte';
  import Icon from '@iconify/svelte';

  let {
    currentPath = '/dashboard',
    children,
    projectSwitcher,
  }: {
    currentPath?: string;
    children?: Snippet;
    projectSwitcher?: Snippet;
  } = $props();

  let drawerOpen = $state(false);
</script>

<div data-testid="sidebar-drawer" class="drawer lg:drawer-open">
  <input
    id="sidebar-drawer-toggle"
    type="checkbox"
    class="drawer-toggle"
    bind:checked={drawerOpen}
  />

  <!-- Main Content -->
  <div data-testid="sidebar-drawer-content" class="drawer-content flex flex-col">
    <!-- Hamburger for mobile -->
    <div class="lg:hidden p-2">
      <label
        for="sidebar-drawer-toggle"
        data-testid="sidebar-hamburger"
        class="btn btn-ghost btn-sm"
        aria-label="Open navigation"
      >
        <Icon icon="iconoir:menu-scale" width={20} />
      </label>
    </div>

    {#if children}
      {@render children()}
    {/if}
  </div>

  <!-- Drawer Side -->
  <div data-testid="sidebar-drawer-side" class="drawer-side z-40">
    <label
      for="sidebar-drawer-toggle"
      data-testid="sidebar-drawer-overlay"
      class="drawer-overlay"
      aria-label="Close navigation"
    ></label>
    <div class="h-full">
      <Sidebar {currentPath} {projectSwitcher} />
    </div>
  </div>
</div>
