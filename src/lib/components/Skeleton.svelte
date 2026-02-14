<script lang="ts">
  let { width = '100%', height = '16px' }: { width?: string; height?: string } = $props();
</script>

<div
  class="animate-pulse bg-white/[0.08] rounded"
  style:width={width}
  style:height={height}
></div>
