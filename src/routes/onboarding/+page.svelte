<script lang="ts">
  import { onMount } from 'svelte';

  let formEl: HTMLFormElement;
  let submitting = $state(false);

  onMount(() => {
    // Auto-submit on mount — creates org via POST (not GET)
    submitting = true;
    formEl.submit();
  });
</script>

<form method="POST" bind:this={formEl}>
  <div class="flex flex-col items-center gap-4">
    <span class="loading loading-spinner loading-lg text-primary"></span>
    <p class="text-base-content/60 text-sm">Setting up your workspace…</p>
    <!-- Fallback for no-JS environments -->
    {#if !submitting}
      <button type="submit" class="btn btn-primary btn-sm">
        Set up workspace
      </button>
    {/if}
  </div>
</form>
