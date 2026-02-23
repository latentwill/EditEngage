<script lang="ts">
  let {
    content,
    media
  }: {
    content: string;
    media?: Array<{ url: string; type: 'image' | 'video' }>;
  } = $props();
</script>

<div data-testid="twitter-preview" class="card bg-base-200 rounded-xl p-4">
  <div class="flex items-start gap-3">
    <div class="w-10 h-10 rounded-full bg-base-300 shrink-0"></div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-1 mb-1">
        <span class="font-bold text-sm text-base-content">Your Name</span>
        <span class="text-xs text-base-content/50">@handle</span>
      </div>
      <p class="text-sm text-base-content whitespace-pre-wrap">{content}</p>
      {#if media && media.length > 0}
        <div class="mt-2 grid gap-2">
          {#each media as item}
            {#if item.type === 'image'}
              <img src={item.url} alt="Media" class="rounded-xl w-full object-cover max-h-48" />
            {:else}
              <video src={item.url} class="rounded-xl w-full max-h-48" controls>
                <track kind="captions" />
              </video>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
