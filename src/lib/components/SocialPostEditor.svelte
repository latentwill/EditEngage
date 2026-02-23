<script lang="ts">
  import LinkedInPreview from './previews/LinkedInPreview.svelte';
  import TwitterPreview from './previews/TwitterPreview.svelte';
  import InstagramPreview from './previews/InstagramPreview.svelte';

  let {
    content,
    platform,
    media,
    onContentChange
  }: {
    content: string;
    platform: 'linkedin' | 'twitter' | 'instagram';
    media?: Array<{ url: string; type: 'image' | 'video' }>;
    onContentChange: (content: string) => void;
  } = $props();

  const charLimits: Record<string, number> = {
    twitter: 280,
    linkedin: 3000,
    instagram: 2200
  };

  const maxLength = $derived(charLimits[platform]);
  const remaining = $derived(maxLength - content.length);

  function handleInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    onContentChange(target.value);
  }
</script>

<div class="flex flex-col gap-4">
  <div class="relative">
    <textarea
      data-testid="social-editor-textarea"
      class="textarea textarea-bordered w-full min-h-[120px] bg-base-200 text-base-content"
      maxlength={maxLength}
      value={content}
      oninput={handleInput}
    ></textarea>
    <div
      data-testid="char-count"
      class="text-xs mt-1 text-right {remaining < 20 ? 'text-error' : 'text-base-content/50'}"
    >
      {remaining}
    </div>
  </div>

  {#if media && media.length > 0}
    <div data-testid="media-preview" class="flex gap-2 flex-wrap">
      {#each media as item}
        {#if item.type === 'image'}
          <img src={item.url} alt="Attachment" class="w-16 h-16 rounded-lg object-cover" />
        {:else}
          <video src={item.url} class="w-16 h-16 rounded-lg object-cover">
            <track kind="captions" />
          </video>
        {/if}
      {/each}
    </div>
  {/if}

  {#if platform === 'linkedin'}
    <LinkedInPreview {content} {media} />
  {:else if platform === 'twitter'}
    <TwitterPreview {content} {media} />
  {:else if platform === 'instagram'}
    <InstagramPreview {content} {media} />
  {/if}
</div>
