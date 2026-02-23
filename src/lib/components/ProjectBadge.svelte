<script lang="ts">
  let {
    project
  }: {
    project: { name: string; color: string };
  } = $props();

  function getContrastColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // WCAG relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)';
  }

  const displayName = $derived(
    project.name.length > 20 ? project.name.slice(0, 20) + '...' : project.name
  );

  const textColor = $derived(getContrastColor(project.color));
</script>

<span
  data-testid="project-badge"
  class="badge badge-sm font-mono text-xs px-2 py-1 rounded-full inline-block"
  style="background-color: {project.color}; color: {textColor};"
>
  {displayName}
</span>
