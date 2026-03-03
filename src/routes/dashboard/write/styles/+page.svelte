<script lang="ts">
  let { data }: { data: { projectId: string; writingStyles: Array<{
    id: string;
    project_id: string;
    name: string;
    tone: string | null;
    voice_guidelines: string | null;
    avoid_phrases: string[];
    example_content: string | null;
    created_at: string;
    updated_at: string;
  }> } } = $props();

  let showForm = $state(false);
  let styleName = $state('');
  let tone = $state('conversational');
  let voiceGuidelines = $state('');
  let avoidPhrases = $state('');
  let exampleContent = $state('');
  let structuralTemplate = $state('');
  let vocabularyLevel = $state('');
  let pointOfView = $state('');
  let antiPatterns = $state('');

  function openForm() {
    showForm = true;
  }

  async function handleSave() {
    const phrasesArray = avoidPhrases
      .split(',')
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0);

    const antiPatternsArray = antiPatterns
      .split(',')
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0);

    await fetch('/api/v1/writing-styles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: styleName,
        tone,
        voice_guidelines: voiceGuidelines,
        avoid_phrases: phrasesArray,
        example_content: exampleContent,
        structural_template: structuralTemplate,
        vocabulary_level: vocabularyLevel,
        point_of_view: pointOfView,
        anti_patterns: antiPatternsArray,
        project_id: data.projectId
      })
    });

    showForm = false;
  }
</script>

<div data-testid="writing-styles-page" class="space-y-6 py-6">
  <h1 class="text-2xl font-bold text-base-content">Writing Styles</h1>

  <div class="grid gap-4">
    {#each data.writingStyles as style}
      <div data-testid="writing-style-card" class="card bg-base-200 shadow-xl p-6 flex flex-row items-center gap-4">
        <span class="text-base-content font-medium">{style.name}</span>
        <span class="badge badge-success">{style.tone}</span>
      </div>
    {/each}
  </div>

  {#if !showForm}
    <button class="btn btn-primary" onclick={openForm}>Create Style</button>
  {/if}

  {#if showForm}
    <form class="card bg-base-200 shadow-xl p-6 space-y-4" onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
      <label class="block text-sm text-base-content/80 mb-1" for="style-name">Style Name</label>
      <input id="style-name" type="text" class="input input-bordered w-full" bind:value={styleName} />

      <label class="block text-sm text-base-content/80 mb-1" for="style-tone">Tone</label>
      <select id="style-tone" class="select select-bordered w-full" bind:value={tone}>
        <option value="conversational">Conversational</option>
        <option value="authoritative">Authoritative</option>
        <option value="playful">Playful</option>
        <option value="technical">Technical</option>
      </select>

      <label class="block text-sm text-base-content/80 mb-1" for="style-guidelines">Voice Guidelines</label>
      <textarea id="style-guidelines" class="textarea textarea-bordered w-full" bind:value={voiceGuidelines}></textarea>

      <label class="block text-sm text-base-content/80 mb-1" for="style-avoid">Avoid Phrases</label>
      <input id="style-avoid" type="text" class="input input-bordered w-full" bind:value={avoidPhrases} />

      <label class="block text-sm text-base-content/80 mb-1" for="style-example">Example Content</label>
      <textarea id="style-example" class="textarea textarea-bordered w-full" bind:value={exampleContent}></textarea>

      <label class="block text-sm text-base-content/80 mb-1" for="structural-template">Structural Template</label>
      <select id="structural-template" data-testid="structural-template-select" class="select select-bordered w-full" bind:value={structuralTemplate}>
        <option value="">None</option>
        <option value="listicle">Listicle</option>
        <option value="long-form">Long-form</option>
        <option value="thread">Thread</option>
        <option value="clinical-summary">Clinical Summary</option>
        <option value="how-to">How-to</option>
        <option value="comparison">Comparison</option>
      </select>

      <label class="block text-sm text-base-content/80 mb-1" for="vocabulary-level">Vocabulary Level</label>
      <select id="vocabulary-level" data-testid="vocabulary-level-select" class="select select-bordered w-full" bind:value={vocabularyLevel}>
        <option value="">None</option>
        <option value="technical">Technical</option>
        <option value="professional">Professional</option>
        <option value="accessible">Accessible</option>
        <option value="casual">Casual</option>
      </select>

      <label class="block text-sm text-base-content/80 mb-1" for="pov">Point of View</label>
      <select id="pov" data-testid="pov-select" class="select select-bordered w-full" bind:value={pointOfView}>
        <option value="">None</option>
        <option value="first-person">First Person</option>
        <option value="second-person">Second Person</option>
        <option value="third-person">Third Person</option>
      </select>

      <label class="block text-sm text-base-content/80 mb-1" for="anti-patterns">Anti-patterns</label>
      <input id="anti-patterns" data-testid="anti-patterns-input" type="text" class="input input-bordered w-full" placeholder="e.g. no clickbait, avoid passive voice" bind:value={antiPatterns} />

      <div class="flex gap-2">
        <button type="submit" class="btn btn-primary">Save Style</button>
        <button type="button" class="btn btn-ghost" onclick={() => { showForm = false; }}>Cancel</button>
      </div>
    </form>
  {/if}
</div>
