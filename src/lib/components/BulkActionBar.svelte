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
    class="sticky bottom-0 z-50 backdrop-blur-[20px] bg-[var(--glass-bg,rgba(255,255,255,0.08))] border border-[var(--glass-border,rgba(255,255,255,0.08))] rounded-xl p-4 flex items-center justify-between"
  >
    <span class="text-sm text-white/70">
      <span data-testid="selected-count" class="font-bold text-white">{selectedIds.length}</span> item{selectedIds.length === 1 ? '' : 's'} selected
    </span>
    <div class="flex gap-2">
      <button
        data-testid="bulk-approve-btn"
        class="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
        onclick={onapprove}
      >
        Approve All
      </button>
      <button
        data-testid="bulk-reject-btn"
        class="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
        onclick={onreject}
      >
        Reject All
      </button>
    </div>
  </div>
{/if}
