<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Settings, Plug } from 'lucide-svelte';

  let {
    data,
    children
  }: {
    data: {
      projectId: string;
      currentPath?: string;
    };
    children?: Snippet;
  } = $props();

  const subNavItems = [
    { href: '/dashboard/settings', label: 'General', icon: Settings },
    { href: '/dashboard/settings/connections', label: 'Connections', icon: Plug },
  ];

  function isActive(href: string): boolean {
    const path = data.currentPath ?? '/dashboard/settings';
    if (href === '/dashboard/settings') {
      return path === '/dashboard/settings';
    }
    return path.startsWith(href);
  }
</script>

<div class="flex gap-6">
  <nav data-testid="settings-sub-nav" class="menu bg-base-200 rounded-box w-56 shrink-0 p-2">
    <li class="menu-title text-xs uppercase tracking-wider">Settings</li>
    {#each subNavItems as item}
      <li>
        <a
          href={item.href}
          class:active={isActive(item.href)}
          aria-current={isActive(item.href) ? 'page' : null}
        >
          <item.icon size={16} />
          {item.label}
        </a>
      </li>
    {/each}
  </nav>

  <div data-testid="settings-content" class="flex-1">
    {@render children?.()}
  </div>
</div>
