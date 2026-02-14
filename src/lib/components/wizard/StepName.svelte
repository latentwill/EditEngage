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
  <h2 class="text-lg font-semibold text-white mb-4">Name your pipeline</h2>

  <div class="mb-4">
    <label class="block text-white/70 text-sm mb-1" for="pipeline-name">Pipeline Name</label>
    <input
      id="pipeline-name"
      data-testid="pipeline-name-input"
      type="text"
      value={name}
      oninput={(e) => onNameChange((e.target as HTMLInputElement).value)}
      class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
      placeholder="Enter pipeline name"
    />
    {#if validationError}
      <div data-testid="name-validation-error" class="text-red-400 text-sm mt-1">
        {validationError}
      </div>
    {/if}
  </div>

  <div class="mb-4">
    <label class="block text-white/70 text-sm mb-1" for="pipeline-description">Description</label>
    <textarea
      id="pipeline-description"
      data-testid="pipeline-description-input"
      value={description}
      oninput={(e) => onDescriptionChange((e.target as HTMLTextAreaElement).value)}
      class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 min-h-[80px]"
      placeholder="Describe what this pipeline does"
    ></textarea>
  </div>
</div>
