<script lang="ts">
  let { width = '100%', height = '16px' }: { width?: string; height?: string } = $props();
</script>

<div
  class="skeleton"
  style:width={width}
  style:height={height}
></div>
