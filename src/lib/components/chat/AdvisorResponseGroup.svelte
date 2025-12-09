<script lang="ts">
	import type { Persona } from '$lib/server/db/schema';
	import AdvisorCard from './AdvisorCard.svelte';
	import SynthesisCard from './SynthesisCard.svelte';

	interface AdvisorResponse {
		persona: Persona | null;
		content: string;
		isStreaming: boolean;
	}

	interface Props {
		userQuestion: string;
		advisorResponses: AdvisorResponse[];
		synthesis?: {
			content: string;
			isStreaming: boolean;
		} | null;
		currentAdvisorIndex?: number;
		totalAdvisors?: number;
	}

	let {
		userQuestion,
		advisorResponses,
		synthesis = null,
		currentAdvisorIndex = -1,
		totalAdvisors = 0
	}: Props = $props();

	const participatingPersonas = $derived(
		advisorResponses.map((r) => r.persona).filter((p): p is Persona => p !== null)
	);

	const isWaitingForAdvisors = $derived(
		currentAdvisorIndex >= 0 && currentAdvisorIndex < totalAdvisors && !synthesis
	);

	const isGeneratingSynthesis = $derived(synthesis?.isStreaming ?? false);
</script>

<div class="space-y-4">
	<!-- User Question -->
	<div class="chat chat-end">
		<div class="chat-bubble chat-bubble-primary text-sm sm:text-base">
			{userQuestion}
		</div>
	</div>

	<!-- Progress indicator for Brain Trust -->
	{#if isWaitingForAdvisors || isGeneratingSynthesis}
		<div class="flex items-center justify-center gap-2 text-sm text-base-content/60 py-2">
			<span class="loading loading-spinner loading-sm"></span>
			{#if isGeneratingSynthesis}
				<span>Generating council synthesis...</span>
			{:else}
				<span>
					Consulting advisors... ({currentAdvisorIndex + 1}/{totalAdvisors})
				</span>
			{/if}
		</div>
	{/if}

	<!-- Advisor Responses -->
	{#each advisorResponses as response, index (response.persona?.id ?? index)}
		<AdvisorCard
			persona={response.persona}
			content={response.content}
			isStreaming={response.isStreaming}
		/>
	{/each}

	<!-- Synthesis -->
	{#if synthesis}
		<div class="mt-6 pt-4 border-t border-base-300">
			<SynthesisCard
				content={synthesis.content}
				isStreaming={synthesis.isStreaming}
				{participatingPersonas}
			/>
		</div>
	{/if}
</div>
