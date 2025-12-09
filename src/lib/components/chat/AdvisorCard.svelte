<script lang="ts">
	import { marked } from 'marked';
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

	// Configure marked for safe rendering
	marked.setOptions({
		gfm: true,
		breaks: true
	});

	const renderedContent = $derived(marked.parse(content) as string);
</script>

<div class="card bg-base-100 shadow-md border-l-4" style={accentStyle}>
	<div class="card-body p-3 sm:p-4">
		<div class="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
			{#if persona}
				<div
					class="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-lg sm:text-xl shrink-0"
					style="background-color: {persona.accentColor}20"
				>
					{persona.avatarEmoji}
				</div>
				<div class="min-w-0">
					<h3 class="font-semibold text-sm sm:text-base text-base-content truncate">{persona.name}</h3>
					<p class="text-xs text-base-content/60 truncate">{persona.role}</p>
				</div>
			{:else}
				<div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-base-300 flex items-center justify-center shrink-0">
					<span class="text-lg sm:text-xl">🤖</span>
				</div>
				<div>
					<h3 class="font-semibold text-sm sm:text-base text-base-content">Advisor</h3>
				</div>
			{/if}

			{#if isStreaming}
				<span class="loading loading-dots loading-sm ml-auto"></span>
			{/if}
		</div>

		<div class="prose prose-sm max-w-none text-sm sm:text-base">
			{@html renderedContent}
		</div>
	</div>
</div>
