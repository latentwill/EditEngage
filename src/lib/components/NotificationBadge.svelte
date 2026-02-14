<script lang="ts">
  let { count = 0 }: { count?: number } = $props();
</script>

{#if count > 0}
  <span
    data-testid="unread-badge"
    class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium"
  >
    {count}
  </span>
{/if}
