<script lang="ts">
  import WorkflowWizard from '$lib/components/WorkflowWizard.svelte';
  let { data } = $props();
</script>

<div data-testid="workflow-wizard-container">
  <WorkflowWizard projectId={data.activeProjectId} />
</div>
