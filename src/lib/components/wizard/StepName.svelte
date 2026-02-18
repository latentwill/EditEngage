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
  <h2 class="text-lg font-semibold text-base-content mb-4">Name your circuit</h2>

  <div class="mb-4">
    <label class="block text-base-content/70 text-sm mb-1" for="pipeline-name">Circuit Name</label>
    <input
      id="pipeline-name"
      data-testid="pipeline-name-input"
      type="text"
      value={name}
      oninput={(e) => onNameChange((e.target as HTMLInputElement).value)}
      class="input input-bordered w-full"
      placeholder="Enter circuit name"
    />
    {#if validationError}
      <div data-testid="name-validation-error" class="text-red-400 text-sm mt-1">
        {validationError}
      </div>
    {/if}
  </div>

  <div class="mb-4">
    <label class="block text-base-content/70 text-sm mb-1" for="pipeline-description">Description</label>
    <textarea
      id="pipeline-description"
      data-testid="pipeline-description-input"
      value={description}
      oninput={(e) => onDescriptionChange((e.target as HTMLTextAreaElement).value)}
      class="textarea textarea-bordered w-full min-h-[80px]"
      placeholder="Describe what this circuit does"
    ></textarea>
  </div>
</div>
