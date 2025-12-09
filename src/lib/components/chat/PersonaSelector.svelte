<script lang="ts">
	import type { Persona } from '$lib/server/db/schema';

	interface Props {
		personas: Persona[];
		selected?: string;
		selectedIds?: string[];
		multiSelect?: boolean;
		onSelect?: (id: string) => void;
		onMultiSelect?: (ids: string[]) => void;
		disabled?: boolean;
	}

	let {
		personas,
		selected = '',
		selectedIds = [],
		multiSelect = false,
		onSelect,
		onMultiSelect,
		disabled = false
	}: Props = $props();

	const selectedPersona = $derived(personas.find((p) => p.id === selected));
	const selectedPersonas = $derived(personas.filter((p) => selectedIds.includes(p.id)));

	function handleClick(personaId: string) {
		if (disabled) return;

		if (multiSelect) {
			const currentIds = [...selectedIds];
			const index = currentIds.indexOf(personaId);
			if (index >= 0) {
				currentIds.splice(index, 1);
			} else {
				currentIds.push(personaId);
			}
			onMultiSelect?.(currentIds);
		} else {
			onSelect?.(personaId);
		}
	}

	function getSelectionOrder(personaId: string): number {
		return selectedIds.indexOf(personaId) + 1;
	}

	function isSelected(personaId: string): boolean {
		if (multiSelect) {
			return selectedIds.includes(personaId);
		}
		return selected === personaId;
	}
</script>

<div class="flex gap-2 flex-wrap">
	{#each personas as persona (persona.id)}
		{@const isActive = isSelected(persona.id)}
		{@const order = multiSelect ? getSelectionOrder(persona.id) : 0}
		<button
			type="button"
			class="btn btn-sm gap-2 relative"
			class:btn-primary={isActive}
			class:btn-ghost={!isActive}
			class:opacity-60={disabled}
			{disabled}
			onclick={() => handleClick(persona.id)}
			style={isActive ? `background-color: ${persona.accentColor}` : ''}
		>
			{#if multiSelect && order > 0}
				<span
					class="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-neutral text-neutral-content text-[11px] font-bold flex items-center justify-center shadow-md z-10"
				>
					{order}
				</span>
			{/if}
			<span>{persona.avatarEmoji}</span>
			<span class="hidden sm:inline">{persona.name}</span>
		</button>
	{/each}
</div>

{#if !multiSelect && selectedPersona}
	<p class="text-xs text-base-content/60 mt-2">
		{selectedPersona.role} &middot; {selectedPersona.defaultModelId}
	</p>
{:else if multiSelect}
	<p class="text-xs text-base-content/60 mt-2">
		{#if selectedIds.length === 0}
			Select 2 or more advisors for the council
		{:else if selectedIds.length === 1}
			Select at least 1 more advisor
		{:else}
			{selectedIds.length} advisors selected &middot; They will respond in order
		{/if}
	</p>
{/if}
