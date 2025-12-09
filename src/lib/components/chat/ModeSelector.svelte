<script lang="ts">
	import type { ConversationMode } from '$lib/server/db/schema';

	interface Props {
		mode: ConversationMode;
		onSelect: (mode: ConversationMode) => void;
		disabled?: boolean;
	}

	let { mode, onSelect, disabled = false }: Props = $props();

	const modes: { id: ConversationMode; label: string; description: string }[] = [
		{
			id: 'quick',
			label: 'Quick Answer',
			description: 'Get a focused response from one advisor'
		},
		{
			id: 'second-opinion',
			label: 'Second Opinion',
			description: 'Coming soon'
		},
		{
			id: 'brain-trust',
			label: 'Brain Trust',
			description: 'Consult all advisors and get a synthesis'
		}
	];

	function handleSelect(newMode: ConversationMode) {
		if (!disabled && newMode !== 'second-opinion') {
			onSelect(newMode);
		}
	}
</script>

<div class="flex flex-col gap-2">
	<div class="flex bg-base-200 rounded-lg p-1 gap-1">
		{#each modes as m (m.id)}
			{@const isActive = mode === m.id}
			{@const isDisabled = m.id === 'second-opinion' || disabled}
			<button
				type="button"
				class="flex-1 px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors"
				class:bg-neutral={isActive}
				class:text-neutral-content={isActive}
				class:hover:bg-base-300={!isActive && !isDisabled}
				class:opacity-40={m.id === 'second-opinion'}
				class:cursor-not-allowed={isDisabled}
				disabled={isDisabled}
				onclick={() => handleSelect(m.id)}
			>
				{m.label}
			</button>
		{/each}
	</div>
	<p class="text-xs text-base-content/60 text-center">
		{modes.find((m) => m.id === mode)?.description}
	</p>
</div>
