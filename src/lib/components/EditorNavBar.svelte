<script lang="ts">
  let { position, total, hasPrev, hasNext, onPrev, onNext, onBack } = $props<{
    position: number;
    total: number;
    hasPrev: boolean;
    hasNext: boolean;
    onPrev: () => void;
    onNext: () => void;
    onBack: () => void;
  }>();
</script>

<div data-testid="editor-nav-bar" class="flex items-center justify-between bg-base-100 border-b border-base-300 px-4 py-2">
  <button data-testid="editor-back-btn" class="btn btn-ghost btn-sm" onclick={onBack}>
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
    Back to Feed
  </button>

  <span data-testid="editor-position" class="text-sm font-medium">
    {position} of {total}
  </span>

  <div class="flex gap-2">
    <button data-testid="editor-prev-btn" class="btn btn-ghost btn-sm" disabled={!hasPrev} onclick={onPrev}>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Prev
    </button>
    <button data-testid="editor-next-btn" class="btn btn-ghost btn-sm" disabled={!hasNext} onclick={onNext}>
      Next
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
  </div>
</div>
