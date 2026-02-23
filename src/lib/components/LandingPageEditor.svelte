<script lang="ts">
  let {
    sections,
    slug,
    onSectionChange
  }: {
    sections: Array<{
      id: string;
      type: 'header' | 'body' | 'cta' | 'faq';
      label: string;
      content: string;
      variables?: Record<string, string>;
    }>;
    slug: string;
    onSectionChange: (sectionId: string, content: string) => void;
  } = $props();

  let activeTab = $state<'edit' | 'preview'>('edit');

  function splitByVariables(text: string): Array<{ text: string; isVar: boolean }> {
    const parts: Array<{ text: string; isVar: boolean }> = [];
    const regex = /(\{[^}]+\})/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), isVar: false });
      }
      parts.push({ text: match[1], isVar: true });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), isVar: false });
    }

    return parts;
  }

  function handleInput(sectionId: string, event: Event) {
    const target = event.target as HTMLTextAreaElement;
    onSectionChange(sectionId, target.value);
  }
</script>

<div>
  <div data-testid="landing-slug" class="font-mono text-sm mb-4">{slug}</div>

  <div class="tabs tabs-boxed mb-4">
    <button
      data-testid="edit-tab"
      class="tab"
      class:tab-active={activeTab === 'edit'}
      onclick={() => activeTab = 'edit'}
    >Edit</button>
    <button
      data-testid="preview-tab"
      class="tab"
      class:tab-active={activeTab === 'preview'}
      onclick={() => activeTab = 'preview'}
    >Preview</button>
  </div>

  {#if activeTab === 'edit'}
    {#each sections as section}
      <div data-testid="section-{section.type}" class="card bg-base-200 mb-4 p-4">
        <h3 class="font-semibold mb-2">{section.label}</h3>
        <div class="mb-2">
          {#each splitByVariables(section.content) as part}
            {#if part.isVar}
              <span data-testid="template-var" class="text-primary font-mono">{part.text}</span>
            {:else}
              <span>{part.text}</span>
            {/if}
          {/each}
        </div>
        <textarea
          class="textarea textarea-bordered w-full"
          value={section.content}
          oninput={(e) => handleInput(section.id, e)}
        ></textarea>
      </div>
    {/each}
  {:else}
    <div data-testid="landing-preview" class="prose">
      {#each sections as section}
        <div>{section.content}</div>
      {/each}
    </div>
  {/if}
</div>
