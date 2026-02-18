<script lang="ts">
  let {
    selectedIds,
    onapprove,
    onreject
  }: {
    selectedIds: string[];
    onapprove: () => void;
    onreject: () => void;
  } = $props();
</script>

{#if selectedIds.length > 0}
  <div
    data-testid="bulk-action-bar"
    class="sticky bottom-0 z-50 card bg-base-200 shadow-xl p-4 flex items-center justify-between"
  >
    <span class="text-sm text-base-content/70">
      <span data-testid="selected-count" class="font-bold text-base-content">{selectedIds.length}</span> item{selectedIds.length === 1 ? '' : 's'} selected
    </span>
    <div class="flex gap-2">
      <button
        data-testid="bulk-approve-btn"
        class="btn btn-success btn-sm"
        onclick={onapprove}
      >
        Approve All
      </button>
      <button
        data-testid="bulk-reject-btn"
        class="btn btn-error btn-sm"
        onclick={onreject}
      >
        Reject All
      </button>
    </div>
  </div>
{/if}
