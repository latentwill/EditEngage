<script lang="ts">
  let {
    name,
    description,
    onNameChange,
    onDescriptionChange,
    validationError
  }: {
    name: string;
    description: string;
    onNameChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    validationError: string | null;
  } = $props();
</script>

<div data-testid="step-name">
  <h2 class="text-lg font-semibold text-base-content mb-4">Name your workflow</h2>

  <div class="mb-4">
    <label class="block text-base-content/70 text-sm mb-1" for="workflow-name">Workflow Name</label>
    <input
      id="workflow-name"
      data-testid="workflow-name-input"
      type="text"
      value={name}
      oninput={(e) => onNameChange((e.target as HTMLInputElement).value)}
      class="input input-bordered w-full"
      placeholder="Enter workflow name"
    />
    {#if validationError}
      <div data-testid="name-validation-error" class="text-red-400 text-sm mt-1">
        {validationError}
      </div>
    {/if}
  </div>

  <div class="mb-4">
    <label class="block text-base-content/70 text-sm mb-1" for="workflow-description">Description</label>
    <textarea
      id="workflow-description"
      data-testid="workflow-description-input"
      value={description}
      oninput={(e) => onDescriptionChange((e.target as HTMLTextAreaElement).value)}
      class="textarea textarea-bordered w-full min-h-[80px]"
      placeholder="Describe what this workflow does"
    ></textarea>
  </div>
</div>
