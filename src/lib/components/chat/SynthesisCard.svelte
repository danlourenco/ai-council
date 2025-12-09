<script lang="ts">
	import { marked } from 'marked';
	import type { Persona } from '$lib/server/db/schema';

	interface Props {
		content: string;
		isStreaming?: boolean;
		participatingPersonas?: Persona[];
	}

	let { content, isStreaming = false, participatingPersonas = [] }: Props = $props();

	// Gold accent for synthesis
	const accentColor = '#c9a227';

	// Configure marked for safe rendering
	marked.setOptions({
		gfm: true,
		breaks: true
	});

	const renderedContent = $derived(marked.parse(content) as string);
</script>

<div class="card bg-base-100 shadow-md border-l-4" style="border-left-color: {accentColor}">
	<div class="card-body p-3 sm:p-4">
		<div class="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
			<div
				class="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-lg sm:text-xl shrink-0"
				style="background-color: {accentColor}20"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="currentColor"
					class="w-5 h-5 sm:w-6 sm:h-6"
					style="color: {accentColor}"
				>
					<path
						fill-rule="evenodd"
						d="M12 2.25a.75.75 0 01.75.75v.756a49.106 49.106 0 019.152 1 .75.75 0 01-.152 1.485h-1.918l2.474 10.124a.75.75 0 01-.375.84A6.723 6.723 0 0118.75 18a6.723 6.723 0 01-3.181-.795.75.75 0 01-.375-.84l2.474-10.124H12.75v13.28c1.293.076 2.534.343 3.697.776a.75.75 0 01-.262 1.453h-8.37a.75.75 0 01-.262-1.453c1.162-.433 2.404-.7 3.697-.776V6.24H6.332l2.474 10.124a.75.75 0 01-.375.84A6.723 6.723 0 015.25 18a6.723 6.723 0 01-3.181-.795.75.75 0 01-.375-.84L4.168 6.241H2.25a.75.75 0 01-.152-1.485 49.105 49.105 0 019.152-1V3a.75.75 0 01.75-.75zm4.878 13.543l1.872-7.662 1.872 7.662h-3.744zm-9.756 0L5.25 8.131l-1.872 7.662h3.744z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
			<div class="min-w-0 flex-1">
				<h3 class="font-semibold text-sm sm:text-base text-base-content">Council Synthesis</h3>
				<p class="text-xs text-base-content/60">Combined insights from the advisors</p>
			</div>

			{#if participatingPersonas.length > 0}
				<div class="flex -space-x-2">
					{#each participatingPersonas as persona (persona.id)}
						<div
							class="w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 border-base-100"
							style="background-color: {persona.accentColor}"
							title={persona.name}
						>
							{persona.avatarEmoji}
						</div>
					{/each}
				</div>
			{/if}

			{#if isStreaming}
				<span class="loading loading-dots loading-sm ml-auto"></span>
			{/if}
		</div>

		<div class="prose prose-sm max-w-none text-sm sm:text-base synthesis-content">
			{@html renderedContent}
		</div>
	</div>
</div>

<style>
	.synthesis-content :global(h2) {
		color: #c9a227;
		font-size: 0.875rem;
		font-weight: 600;
		margin-top: 1rem;
		margin-bottom: 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.synthesis-content :global(h2:first-child) {
		margin-top: 0;
	}
</style>
