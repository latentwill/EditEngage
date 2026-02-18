<script lang="ts">
  import CircuitWizard from '$lib/components/CircuitWizard.svelte';
  let { data } = $props();
</script>

<div data-testid="circuit-wizard-container">
  <CircuitWizard projectId={data.activeProjectId} />
</div>
