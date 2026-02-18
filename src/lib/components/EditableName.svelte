<script lang="ts">
  let props: {
    value: string;
    onSave: (newValue: string) => void;
    className?: string;
  } = $props();

  let editing = $state(false);
  let draft = $state(props.value);

  function startEditing() {
    draft = props.value;
    editing = true;
  }

  function commit() {
    editing = false;
    props.onSave(draft);
  }

  function cancel() {
    editing = false;
    draft = props.value;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      commit();
    } else if (e.key === 'Escape') {
      cancel();
    }
  }
</script>

{#if editing}
  <!-- svelte-ignore a11y_autofocus -->
  <input
    type="text"
    bind:value={draft}
    onkeydown={handleKeyDown}
    onblur={commit}
    class="bg-white/[0.06] border border-white/[0.08] rounded px-2 py-1 text-white outline-none focus:border-emerald-500/40 {props.className ?? ''}"
    autofocus
  />
{:else}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <span
    class="group inline-flex items-center gap-1.5 text-white cursor-pointer hover:underline hover:decoration-white/30 {props.className ?? ''}"
    onclick={startEditing}
  >
    {props.value}
    <svg
      class="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity duration-200"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  </span>
{/if}
