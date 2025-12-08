<script lang="ts">
	import type { Persona } from '$lib/server/db/schema';

	interface Props {
		persona?: Persona | null;
		content: string;
		isStreaming?: boolean;
	}

	let { persona, content, isStreaming = false }: Props = $props();

	const accentStyle = $derived(
		persona?.accentColor ? `border-left-color: ${persona.accentColor}` : ''
	);
</script>

<div class="card bg-base-100 shadow-md border-l-4" style={accentStyle}>
	<div class="card-body p-4">
		<div class="flex items-center gap-3 mb-3">
			{#if persona}
				<div
					class="w-10 h-10 rounded-full flex items-center justify-center text-xl"
					style="background-color: {persona.accentColor}20"
				>
					{persona.avatarEmoji}
				</div>
				<div>
					<h3 class="font-semibold text-base-content">{persona.name}</h3>
					<p class="text-xs text-base-content/60">{persona.role}</p>
				</div>
			{:else}
				<div class="w-10 h-10 rounded-full bg-base-300 flex items-center justify-center">
					<span class="text-xl">🤖</span>
				</div>
				<div>
					<h3 class="font-semibold text-base-content">Advisor</h3>
				</div>
			{/if}

			{#if isStreaming}
				<span class="loading loading-dots loading-sm ml-auto"></span>
			{/if}
		</div>

		<div class="prose prose-sm max-w-none">
			{@html content.replace(/\n/g, '<br>')}
		</div>
	</div>
</div>
