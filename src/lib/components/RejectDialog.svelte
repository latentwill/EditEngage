<script lang="ts">
  let { isOpen, onConfirm, onCancel }: {
    isOpen: boolean;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
  } = $props();

  let reason = $state('');
</script>

{#if isOpen}
  <div class="modal modal-open" data-testid="reject-dialog">
    <div class="modal-box">
      <h3 class="font-bold text-lg">Reject Content</h3>
      <textarea
        class="textarea textarea-bordered w-full mt-4"
        data-testid="reject-reason-textarea"
        placeholder="Enter rejection reason..."
        bind:value={reason}
      ></textarea>
      <div class="modal-action">
        <button class="btn btn-ghost" data-testid="reject-cancel-btn" onclick={onCancel}>Cancel</button>
        <button class="btn btn-error" data-testid="reject-confirm-btn" disabled={reason.trim() === ''} onclick={() => onConfirm(reason)}>Confirm</button>
      </div>
    </div>
  </div>
{/if}
