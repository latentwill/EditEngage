<script lang="ts">
  import type { Snippet } from 'svelte';
  import ThemeToggle from './ThemeToggle.svelte';

  let {
    currentPath = '/dashboard',
    children
  }: {
    currentPath?: string;
    children?: Snippet;
  } = $props();

  let mobileMenuOpen = $state(false);

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/pipelines', label: 'Pipelines' },
    { href: '/dashboard/content', label: 'Content' },
    { href: '/dashboard/topics', label: 'Topics' },
    { href: '/dashboard/settings', label: 'Settings' }
  ];

  function isActive(href: string): boolean {
    if (href === '/dashboard') {
      return currentPath === '/dashboard';
    }
    return currentPath.startsWith(href);
  }

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }
</script>

<nav
  data-testid="glass-nav"
  class="fixed top-0 left-0 right-0 z-40 backdrop-blur-[20px] bg-black/40 border-b border-white/[0.08] px-6 py-3"
>
  <div class="flex items-center justify-between max-w-7xl mx-auto">
    <!-- Logo -->
    <div class="flex items-center gap-4">
      <a href="/" class="text-lg font-bold text-white">EditEngage</a>
      <div data-testid="project-switcher-slot">
        {#if children}
          {@render children()}
        {/if}
      </div>
    </div>

    <!-- Desktop Nav Links -->
    <div data-testid="desktop-nav-links" class="hidden md:flex items-center gap-1">
      {#each navLinks as link}
        <a
          href={link.href}
          class="px-3 py-2 rounded-lg text-sm transition-all duration-300 {isActive(link.href) ? 'text-white bg-white/[0.12]' : 'text-white/60 hover:text-white hover:bg-white/[0.06]'}"
          aria-current={isActive(link.href) ? 'page' : null}
        >
          {link.label}
        </a>
      {/each}
    </div>

    <!-- Right side: ThemeToggle + Avatar + Hamburger -->
    <div class="flex items-center gap-3">
      <ThemeToggle />
      <div
        data-testid="avatar-placeholder"
        class="w-8 h-8 rounded-full bg-white/[0.12] border border-white/[0.08]"
      ></div>
      <button
        data-testid="hamburger-menu"
        class="md:hidden p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] transition-all duration-300"
        aria-label="Toggle menu"
        onclick={toggleMobileMenu}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
    </div>
  </div>

  <!-- Mobile Nav -->
  <div
    data-testid="mobile-nav"
    class="md:hidden {mobileMenuOpen ? '' : 'hidden'}"
  >
    <div class="flex flex-col gap-1 pt-3 pb-2">
      {#each navLinks as link}
        <a
          href={link.href}
          class="px-3 py-2 rounded-lg text-sm transition-all duration-300 {isActive(link.href) ? 'text-white bg-white/[0.12]' : 'text-white/60 hover:text-white hover:bg-white/[0.06]'}"
          aria-current={isActive(link.href) ? 'page' : null}
        >
          {link.label}
        </a>
      {/each}
    </div>
  </div>
</nav>
