<script lang="ts">
  import type { Snippet } from 'svelte';
  import GlassNav from '$lib/components/GlassNav.svelte';
  import ProjectSwitcher from '$lib/components/ProjectSwitcher.svelte';

  let {
    data,
    children
  }: {
    data: {
      projects: Array<{ id: string; name: string; icon: string | null; color: string | null }>;
      orgId: string | undefined;
      session: { user: { id: string; email: string }; access_token: string } | null;
    };
    children?: Snippet;
  } = $props();
</script>

<div class="min-h-screen flex flex-col">
  <GlassNav currentPath="/dashboard">
    <ProjectSwitcher projects={data.projects} orgId={data.orgId} />
  </GlassNav>

  <main id="main-content" data-testid="dashboard-main" class="flex-1 pt-16 px-6 pb-20">
    <div class="max-w-7xl mx-auto">
      {@render children?.()}
    </div>
  </main>

  <div
    data-testid="command-ticker-slot"
    class="fixed bottom-0 left-0 right-0 h-10 bg-base-100/80 backdrop-blur-lg border-t border-base-300 flex items-center px-6 z-30"
  >
    <span class="text-xs text-base-content/40">Command Ticker</span>
  </div>
</div>
