<script lang="ts">
  import { onMount } from 'svelte';

  let isDark = $state(true);

  function getStorage(): Storage | null {
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        return localStorage;
      }
    } catch {
      // localStorage not available
    }
    return null;
  }

  onMount(() => {
    const storage = getStorage();
    const saved = storage?.getItem('theme') ?? null;
    isDark = saved ? saved === 'dark' : true;
    document.documentElement.setAttribute('data-theme', isDark ? 'editengage' : 'light');
  });

  function toggle() {
    isDark = !isDark;
    document.documentElement.setAttribute('data-theme', isDark ? 'editengage' : 'light');
    getStorage()?.setItem('theme', isDark ? 'dark' : 'light');
  }
</script>

<button
  data-testid="theme-toggle"
  onclick={toggle}
  class="btn btn-ghost btn-sm btn-circle"
  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
>
  {#if isDark}
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
  {:else}
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
  {/if}
</button>
