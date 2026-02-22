<script lang="ts">
  let {
    content,
    media
  }: {
    content: string;
    media?: Array<{ url: string; type: 'image' | 'video' }>;
  } = $props();
</script>

<div data-testid="instagram-preview" class="card bg-base-200 rounded-xl overflow-hidden">
  {#if media && media.length > 0}
    <div class="w-full aspect-square bg-base-300 flex items-center justify-center">
      {#each media as item}
        {#if item.type === 'image'}
          <img src={item.url} alt="Media" class="w-full h-full object-cover" />
        {:else}
          <video src={item.url} class="w-full h-full object-cover" controls>
            <track kind="captions" />
          </video>
        {/if}
      {/each}
    </div>
  {:else}
    <div class="w-full aspect-square bg-base-300 flex items-center justify-center">
      <span class="text-base-content/30 text-sm">No media</span>
    </div>
  {/if}
  <div class="p-3">
    <div class="flex items-center gap-2 mb-2">
      <div class="w-8 h-8 rounded-full bg-base-300"></div>
      <span class="font-semibold text-sm text-base-content">your_handle</span>
    </div>
    <p class="text-sm text-base-content whitespace-pre-wrap">{content}</p>
  </div>
</div>
