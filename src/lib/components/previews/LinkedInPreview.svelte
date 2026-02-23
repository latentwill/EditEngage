<script lang="ts">
  let {
    content,
    media
  }: {
    content: string;
    media?: Array<{ url: string; type: 'image' | 'video' }>;
  } = $props();
</script>

<div data-testid="linkedin-preview" class="card bg-base-200 rounded-xl p-4">
  <div class="flex items-center gap-3 mb-3">
    <div class="w-10 h-10 rounded-full bg-base-300"></div>
    <div>
      <div class="font-semibold text-sm text-base-content">Your Name</div>
      <div class="text-xs text-base-content/50">LinkedIn Member</div>
    </div>
  </div>
  <p class="text-sm text-base-content whitespace-pre-wrap">{content}</p>
  {#if media && media.length > 0}
    <div class="mt-3 grid gap-2">
      {#each media as item}
        {#if item.type === 'image'}
          <img src={item.url} alt="Media" class="rounded-lg w-full object-cover max-h-48" />
        {:else}
          <video src={item.url} class="rounded-lg w-full max-h-48" controls>
            <track kind="captions" />
          </video>
        {/if}
      {/each}
    </div>
  {/if}
</div>
