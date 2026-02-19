<script lang="ts">
  import type { Snippet } from 'svelte';
  import ThemeToggle from './ThemeToggle.svelte';
  import {
    LayoutDashboard,
    GitBranch,
    PenTool,
    FileText,
    ListChecks,
    Search,
    Send,
    Settings,
    ChevronDown,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight
  } from 'lucide-svelte';

  let {
    currentPath = '/dashboard',
    collapsed: initialCollapsed = false,
    projectSwitcher,
  }: {
    currentPath?: string;
    collapsed?: boolean;
    projectSwitcher?: Snippet;
  } = $props();

  let isCollapsed = $state(initialCollapsed);

  type NavItem = {
    href: string;
    label: string;
    testId: string;
    icon: typeof LayoutDashboard;
    children?: NavItem[];
  };

  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', testId: 'nav-link-dashboard', icon: LayoutDashboard },
    { href: '/dashboard/workflows', label: 'Workflows', testId: 'nav-link-workflows', icon: GitBranch },
    {
      href: '/dashboard/write',
      label: 'Write',
      testId: 'nav-link-write',
      icon: PenTool,
      children: [
        { href: '/dashboard/write/content', label: 'Content Library', testId: 'nav-link-write-content', icon: FileText },
        { href: '/dashboard/write/topics', label: 'Topics', testId: 'nav-link-write-topics', icon: ListChecks },
      ]
    },
    { href: '/dashboard/research', label: 'Research', testId: 'nav-link-research', icon: Search },
    { href: '/dashboard/publish', label: 'Publish', testId: 'nav-link-publish', icon: Send },
    { href: '/dashboard/settings', label: 'Settings', testId: 'nav-link-settings', icon: Settings },
  ];

  function isActive(href: string): boolean {
    if (href === '/dashboard') {
      return currentPath === '/dashboard';
    }
    return currentPath.startsWith(href);
  }

  let writeOpen = $state(true);

  function toggleCollapse() {
    isCollapsed = !isCollapsed;
  }
</script>

<aside
  data-testid="sidebar"
  class="flex flex-col h-full bg-base-200 border-r border-base-300 transition-[width] duration-300 {isCollapsed ? 'w-16' : 'w-60'}"
>
  <!-- Project Switcher Area -->
  <div data-testid="sidebar-project-switcher" class="p-3 border-b border-base-300">
    {#if projectSwitcher && !isCollapsed}
      {@render projectSwitcher()}
    {/if}
  </div>

  <!-- Navigation -->
  <nav class="flex-1 overflow-y-auto py-2">
    <ul class="menu menu-sm gap-1 px-2">
      {#each navItems as item}
        {#if item.children}
          <!-- Write with sub-menu -->
          <li>
            {#if isCollapsed}
              <div class="tooltip tooltip-right" data-tip={item.label} data-testid="nav-tooltip">
                <button
                  data-testid={item.testId}
                  class="flex items-center justify-center"
                  class:active={isActive(item.href)}
                  aria-current={isActive(item.href) ? 'page' : null}
                  onclick={() => { writeOpen = !writeOpen; }}
                >
                  <span data-testid="nav-icon">
                    <item.icon size={18} />
                  </span>
                  <span data-testid="nav-label" class="hidden">{item.label}</span>
                </button>
              </div>
            {:else}
              <button
                data-testid={item.testId}
                class="flex items-center gap-2"
                class:active={isActive(item.href)}
                aria-current={isActive(item.href) ? 'page' : null}
                onclick={() => { writeOpen = !writeOpen; }}
              >
                <span data-testid="nav-icon">
                  <item.icon size={18} />
                </span>
                <span data-testid="nav-label">{item.label}</span>
                <span class="ml-auto">
                  {#if writeOpen}
                    <ChevronDown size={14} />
                  {:else}
                    <ChevronRight size={14} />
                  {/if}
                </span>
              </button>
            {/if}
            {#if writeOpen && !isCollapsed}
              <ul data-testid="write-submenu" class="menu menu-sm">
                {#each item.children as child}
                  <li>
                    <a
                      href={child.href}
                      data-testid={child.testId}
                      class="flex items-center gap-2"
                      class:active={isActive(child.href)}
                      aria-current={isActive(child.href) ? 'page' : null}
                    >
                      <span data-testid="nav-icon">
                        <child.icon size={16} />
                      </span>
                      <span data-testid="nav-label">{child.label}</span>
                    </a>
                  </li>
                {/each}
              </ul>
            {/if}
          </li>
        {:else}
          <!-- Regular nav item -->
          <li>
            {#if isCollapsed}
              <div class="tooltip tooltip-right" data-tip={item.label} data-testid="nav-tooltip">
                <a
                  href={item.href}
                  data-testid={item.testId}
                  class="flex items-center justify-center"
                  class:active={isActive(item.href)}
                  aria-current={isActive(item.href) ? 'page' : null}
                >
                  <span data-testid="nav-icon">
                    <item.icon size={18} />
                  </span>
                  <span data-testid="nav-label" class="hidden">{item.label}</span>
                </a>
              </div>
            {:else}
              <a
                href={item.href}
                data-testid={item.testId}
                class="flex items-center gap-2"
                class:active={isActive(item.href)}
                aria-current={isActive(item.href) ? 'page' : null}
              >
                <span data-testid="nav-icon">
                  <item.icon size={18} />
                </span>
                <span data-testid="nav-label">{item.label}</span>
              </a>
            {/if}
          </li>
        {/if}
      {/each}
    </ul>
  </nav>

  <!-- Collapse Toggle -->
  <div class="px-2 py-1 border-t border-base-300">
    <button
      data-testid="sidebar-collapse-toggle"
      onclick={toggleCollapse}
      class="btn btn-ghost btn-sm w-full flex items-center justify-center"
      aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {#if isCollapsed}
        <ChevronsRight size={18} />
      {:else}
        <ChevronsLeft size={18} />
      {/if}
    </button>
  </div>

  <!-- Bottom Section -->
  <div data-testid="sidebar-bottom" class="p-3 border-t border-base-300 flex items-center {isCollapsed ? 'justify-center' : 'justify-between'}">
    <div data-testid="sidebar-theme-toggle">
      <ThemeToggle />
    </div>
    {#if !isCollapsed}
      <div data-testid="sidebar-avatar" class="avatar placeholder">
        <div class="bg-neutral text-neutral-content w-8 rounded-full">
          <span class="text-xs">U</span>
        </div>
      </div>
    {:else}
      <div data-testid="sidebar-avatar" class="avatar placeholder hidden">
        <div class="bg-neutral text-neutral-content w-8 rounded-full">
          <span class="text-xs">U</span>
        </div>
      </div>
    {/if}
  </div>
</aside>
