<script lang="ts">
  let { data }: { data: { writingStyles: Array<{
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

  function openForm() {
    showForm = true;
  }

  async function handleSave() {
    const phrasesArray = avoidPhrases
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
        example_content: exampleContent
      })
    });

    showForm = false;
  }
</script>

<div data-testid="writing-styles-page">
  <h1>Writing Styles</h1>

  {#each data.writingStyles as style}
    <div data-testid="writing-style-card">
      <span>{style.name}</span>
      <span>{style.tone}</span>
    </div>
  {/each}

  {#if !showForm}
    <button onclick={openForm}>Create Style</button>
  {/if}

  {#if showForm}
    <form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
      <label for="style-name">Style Name</label>
      <input id="style-name" type="text" bind:value={styleName} />

      <label for="style-tone">Tone</label>
      <select id="style-tone" bind:value={tone}>
        <option value="conversational">Conversational</option>
        <option value="authoritative">Authoritative</option>
        <option value="playful">Playful</option>
        <option value="technical">Technical</option>
      </select>

      <label for="style-guidelines">Voice Guidelines</label>
      <textarea id="style-guidelines" bind:value={voiceGuidelines}></textarea>

      <label for="style-avoid">Avoid Phrases</label>
      <input id="style-avoid" type="text" bind:value={avoidPhrases} />

      <label for="style-example">Example Content</label>
      <textarea id="style-example" bind:value={exampleContent}></textarea>

      <button type="submit">Save Style</button>
    </form>
  {/if}
</div>
