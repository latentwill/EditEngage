<script lang="ts">
  import type { Snippet } from 'svelte';
  import { untrack } from 'svelte';
  import ThemeToggle from './ThemeToggle.svelte';
  import Icon from '@iconify/svelte';

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
    icon: string;
    children?: NavItem[];
  };

  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', testId: 'nav-link-dashboard', icon: 'iconoir:home-simple' },
    { href: '/dashboard/workflows', label: 'Workflows', testId: 'nav-link-workflows', icon: 'iconoir:git-branch' },
    {
      href: '/dashboard/write',
      label: 'Write',
      testId: 'nav-link-write',
      icon: 'iconoir:edit-pencil',
      children: [
        { href: '/dashboard/write/content', label: 'Content Library', testId: 'nav-link-write-content', icon: 'iconoir:journal' },
        { href: '/dashboard/write/topics', label: 'Topics', testId: 'nav-link-write-topics', icon: 'iconoir:list' },
        { href: '/dashboard/write/styles', label: 'Writing Styles', testId: 'nav-link-write-styles', icon: 'iconoir:suggestion' },
        { href: '/dashboard/write/agents', label: 'Agents', testId: 'nav-link-write-agents', icon: 'iconoir:cpu' },
      ]
    },
    { href: '/dashboard/research', label: 'Research', testId: 'nav-link-research', icon: 'iconoir:search' },
    {
      href: '/dashboard/publish',
      label: 'Publish',
      testId: 'nav-link-publish',
      icon: 'iconoir:send-diagonal',
      children: [
        { href: '/dashboard/publish/destinations', label: 'Destinations', testId: 'nav-link-publish-destinations', icon: 'iconoir:position' },
      ]
    },
    { href: '/dashboard/settings', label: 'Settings', testId: 'nav-link-settings', icon: 'iconoir:settings' },
  ];

  function isActive(href: string): boolean {
    if (href === '/dashboard') {
      return currentPath === '/dashboard';
    }
    return currentPath.startsWith(href);
  }

  let openSections = $state<Set<string>>(new Set(['write']));

  function toggleSection(label: string) {
    const key = label.toLowerCase();
    const next = new Set(openSections);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    openSections = next;
  }

  // Auto-open sections when navigating to their children
  $effect(() => {
    const path = currentPath;
    const keysToOpen: string[] = [];
    for (const item of navItems) {
      if (item.children && path.startsWith(item.href)) {
        keysToOpen.push(item.label.toLowerCase());
      }
    }
    untrack(() => {
      let changed = false;
      for (const key of keysToOpen) {
        if (!openSections.has(key)) {
          changed = true;
        }
      }
      if (changed) {
        openSections = new Set([...openSections, ...keysToOpen]);
      }
    });
  });

  function toggleCollapse() {
    isCollapsed = !isCollapsed;
  }

  /** Collect all top-level nav testIds for keyboard navigation ordering */
  const topLevelTestIds = navItems.map(item => item.testId);

  function handleNavKeydown(event: KeyboardEvent) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    const activeEl = document.activeElement;
    if (!activeEl) return;

    const currentTestId = activeEl.getAttribute('data-testid');
    if (!currentTestId) return;

    const currentIndex = topLevelTestIds.indexOf(currentTestId);
    if (currentIndex === -1) return;

    event.preventDefault();

    let nextIndex: number;
    if (event.key === 'ArrowDown') {
      nextIndex = currentIndex + 1;
      if (nextIndex >= topLevelTestIds.length) return;
    } else {
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) return;
    }

    const nextTestId = topLevelTestIds[nextIndex];
    const nextEl = document.querySelector(`[data-testid="${nextTestId}"]`) as HTMLElement | null;
    if (nextEl) {
      nextEl.focus();
    }
  }
</script>

<aside
  data-testid="sidebar"
  class="flex flex-col h-full bg-base-200 border-r border-base-300 transition-[width] duration-300 {isCollapsed ? 'w-16' : 'w-60'}"
>
  <!-- Logo -->
  <div data-testid="sidebar-logo" class="flex items-center gap-2 px-4 pt-4 pb-3">
    <div class="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
      <span aria-hidden="true" class="text-primary-content font-bold text-sm">E</span>
    </div>
    <span data-testid="sidebar-logo-text" class="font-semibold text-base-content text-sm tracking-tight {isCollapsed ? 'hidden' : ''}">editengage</span>
  </div>

  <!-- Project Switcher Area -->
  <div data-testid="sidebar-project-switcher" class="px-3 pb-3 border-b border-base-300">
    {#if projectSwitcher && !isCollapsed}
      {@render projectSwitcher()}
    {/if}
  </div>

  <!-- Navigation -->
  <nav class="flex-1 overflow-y-auto pt-3 pb-2">
    <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
    <ul class="menu menu-sm gap-1 px-2" role="listbox" onkeydown={handleNavKeydown}>
      {#each navItems as item}
        {#if item.children}
          <!-- Expandable section (Write, Publish, etc.) -->
          <li>
            {#if isCollapsed}
              <div class="tooltip tooltip-right" data-tip={item.label} data-testid="nav-tooltip">
                <button
                  data-testid={item.testId}
                  class="flex items-center justify-center {isActive(item.href) ? 'border-l-2 border-primary' : ''}"
                  aria-current={isActive(item.href) ? 'page' : null}
                  onclick={() => { toggleSection(item.label); }}
                >
                  <span data-testid="nav-icon">
                    <Icon icon={item.icon} width={18} height={18} />
                  </span>
                  <span data-testid="nav-label" class="hidden">{item.label}</span>
                </button>
              </div>
            {:else}
              <button
                data-testid={item.testId}
                class="flex items-center gap-2 {isActive(item.href) ? 'border-l-2 border-primary' : ''}"
                aria-current={isActive(item.href) ? 'page' : null}
                onclick={() => { toggleSection(item.label); }}
              >
                <span data-testid="nav-icon">
                  <Icon icon={item.icon} width={18} height={18} />
                </span>
                <span data-testid="nav-label">
                  {#if isActive(item.href)}<span data-testid="nav-pilcrow" class="font-mono text-primary text-xs">¶</span>{/if}
                  {item.label}
                </span>
                <span class="ml-auto">
                  {#if openSections.has(item.label.toLowerCase())}
                    <Icon icon="iconoir:nav-arrow-down" width={14} height={14} />
                  {:else}
                    <Icon icon="iconoir:nav-arrow-right" width={14} height={14} />
                  {/if}
                </span>
              </button>
            {/if}
            {#if openSections.has(item.label.toLowerCase()) && !isCollapsed}
              <ul data-testid="{item.label.toLowerCase()}-submenu" class="menu menu-sm">
                {#each item.children as child}
                  <li>
                    <a
                      href={child.href}
                      data-testid={child.testId}
                      class="flex items-center gap-2 {isActive(child.href) ? 'border-l-2 border-primary' : ''}"
                      aria-current={isActive(child.href) ? 'page' : null}
                    >
                      <span data-testid="nav-icon">
                        <Icon icon={child.icon} width={16} height={16} />
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
                  class="flex items-center justify-center {isActive(item.href) ? 'border-l-2 border-primary' : ''}"
                  aria-current={isActive(item.href) ? 'page' : null}
                >
                  <span data-testid="nav-icon">
                    <Icon icon={item.icon} width={18} height={18} />
                  </span>
                  <span data-testid="nav-label" class="hidden">{item.label}</span>
                </a>
              </div>
            {:else}
              <a
                href={item.href}
                data-testid={item.testId}
                class="flex items-center gap-2 {isActive(item.href) ? 'border-l-2 border-primary' : ''}"
                aria-current={isActive(item.href) ? 'page' : null}
              >
                <span data-testid="nav-icon">
                  <Icon icon={item.icon} width={18} height={18} />
                </span>
                <span data-testid="nav-label">
                  {#if isActive(item.href) && !isCollapsed}<span data-testid="nav-pilcrow" class="font-mono text-primary text-xs">¶</span>{/if}
                  {item.label}
                </span>
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
        <Icon icon="iconoir:fast-arrow-right" width={18} height={18} />
      {:else}
        <Icon icon="iconoir:fast-arrow-left" width={18} height={18} />
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
