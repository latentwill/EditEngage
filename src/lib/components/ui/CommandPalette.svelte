<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	type CommandItem = { value: string; label: string };
	type CommandGroup = { group: string; items: CommandItem[] };

	let {
		commands = [],
		onSelect
	}: {
		commands: CommandGroup[];
		onSelect?: (value: string) => void;
	} = $props();

	let isOpen = $state(false);
	let searchQuery = $state('');
	let inputEl: HTMLInputElement | undefined = $state();

	function handleKeyDown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			isOpen = !isOpen;
			if (isOpen) {
				searchQuery = '';
				setTimeout(() => inputEl?.focus(), 0);
			}
		}
		if (e.key === 'Escape' && isOpen) {
			e.preventDefault();
			isOpen = false;
		}
	}

	let filteredCommands = $derived(
		commands
			.map((group) => ({
				...group,
				items: group.items.filter((item) =>
					item.label.toLowerCase().includes(searchQuery.toLowerCase())
				)
			}))
			.filter((group) => group.items.length > 0)
	);

	function selectItem(value: string) {
		onSelect?.(value);
		isOpen = false;
	}

	onMount(() => {
		document.addEventListener('keydown', handleKeyDown);
	});

	onDestroy(() => {
		document.removeEventListener('keydown', handleKeyDown);
	});
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		data-testid="palette-backdrop"
		class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
		onclick={() => (isOpen = false)}
	></div>
	<div
		data-testid="command-palette"
		class="fixed left-1/2 top-1/4 z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-[--border-strong] bg-base-200 shadow-2xl"
	>
		<div class="flex items-center gap-2 border-b border-[--border] px-4 py-3">
			<span data-testid="palette-prompt" class="font-mono text-primary">^</span>
			<input
				bind:this={inputEl}
				bind:value={searchQuery}
				data-testid="palette-input"
				class="flex-1 bg-transparent font-mono text-base-content outline-none placeholder:text-base-content/40"
				placeholder="Type a command..."
			/>
		</div>
		<div class="max-h-80 overflow-y-auto p-2">
			{#each filteredCommands as group}
				<div
					data-testid="palette-group-header"
					class="px-3 py-2 font-mono text-xs uppercase tracking-widest text-primary"
				>
					¶ {group.group}
				</div>
				{#each group.items as item}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						data-testid="palette-item"
						class="cursor-pointer rounded px-3 py-2 text-sm text-base-content hover:bg-base-300"
						onclick={() => selectItem(item.value)}
					>
						{item.label}
					</div>
				{/each}
			{/each}
		</div>
	</div>
{/if}
