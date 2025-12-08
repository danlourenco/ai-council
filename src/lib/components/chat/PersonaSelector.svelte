<script lang="ts">
	import type { Persona } from '$lib/server/db/schema';

	interface Props {
		personas: Persona[];
		selected: string;
		onSelect: (id: string) => void;
	}

	let { personas, selected, onSelect }: Props = $props();

	const selectedPersona = $derived(personas.find((p) => p.id === selected));
</script>

<div class="flex gap-2 flex-wrap">
	{#each personas as persona (persona.id)}
		<button
			type="button"
			class="btn btn-sm gap-2"
			class:btn-primary={selected === persona.id}
			class:btn-ghost={selected !== persona.id}
			onclick={() => onSelect(persona.id)}
			style={selected === persona.id ? `background-color: ${persona.accentColor}` : ''}
		>
			<span>{persona.avatarEmoji}</span>
			<span class="hidden sm:inline">{persona.name}</span>
		</button>
	{/each}
</div>

{#if selectedPersona}
	<p class="text-xs text-base-content/60 mt-2">
		{selectedPersona.role} &middot; {selectedPersona.defaultModelId}
	</p>
{/if}
