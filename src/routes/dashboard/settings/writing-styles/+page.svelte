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

<div data-testid="writing-styles-page" class="space-y-6">
  <h1 class="text-2xl font-bold text-white">Writing Styles</h1>

  <div class="grid gap-4">
    {#each data.writingStyles as style}
      <div data-testid="writing-style-card" class="backdrop-blur-[20px] bg-white/[0.08] border border-white/[0.12] rounded-xl p-6 flex items-center gap-4">
        <span class="text-white font-medium">{style.name}</span>
        <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">{style.tone}</span>
      </div>
    {/each}
  </div>

  {#if !showForm}
    <button class="bg-emerald-500 hover:bg-emerald-400 text-white font-medium px-6 py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25" onclick={openForm}>Create Style</button>
  {/if}

  {#if showForm}
    <form class="backdrop-blur-[20px] bg-white/[0.08] border border-white/[0.12] rounded-xl p-6 space-y-4" onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
      <label class="block text-sm text-white/80 mb-1" for="style-name">Style Name</label>
      <input id="style-name" type="text" class="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all duration-300" bind:value={styleName} />

      <label class="block text-sm text-white/80 mb-1" for="style-tone">Tone</label>
      <select id="style-tone" class="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all duration-300" bind:value={tone}>
        <option value="conversational">Conversational</option>
        <option value="authoritative">Authoritative</option>
        <option value="playful">Playful</option>
        <option value="technical">Technical</option>
      </select>

      <label class="block text-sm text-white/80 mb-1" for="style-guidelines">Voice Guidelines</label>
      <textarea id="style-guidelines" class="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all duration-300" bind:value={voiceGuidelines}></textarea>

      <label class="block text-sm text-white/80 mb-1" for="style-avoid">Avoid Phrases</label>
      <input id="style-avoid" type="text" class="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all duration-300" bind:value={avoidPhrases} />

      <label class="block text-sm text-white/80 mb-1" for="style-example">Example Content</label>
      <textarea id="style-example" class="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all duration-300" bind:value={exampleContent}></textarea>

      <button type="submit" class="bg-emerald-500 hover:bg-emerald-400 text-white font-medium px-6 py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25">Save Style</button>
    </form>
  {/if}
</div>
