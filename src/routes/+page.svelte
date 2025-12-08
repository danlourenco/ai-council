<script lang="ts">
	import { PersonaPreviewCard } from '$lib/components/ui';

	let { data } = $props();
</script>

<svelte:head>
	<title>The Council</title>
</svelte:head>

<div class="min-h-screen bg-base-200 flex flex-col items-center justify-center p-4 sm:p-8">
	<div class="text-center max-w-2xl">
		<h1 class="text-3xl sm:text-4xl md:text-5xl font-bold text-base-content mb-3 sm:mb-4">The Council</h1>
		<p class="text-base sm:text-lg md:text-xl text-ink-muted mb-6 sm:mb-8">
			Your personal advisory council of AI perspectives
		</p>

		<div class="flex flex-wrap gap-3 sm:gap-4 justify-center mb-8 sm:mb-12">
			<PersonaPreviewCard emoji="🦉" name="The Sage" accentColor="#7d9a78" />
			<PersonaPreviewCard emoji="🦊" name="The Skeptic" accentColor="#8b6b8b" />
			<PersonaPreviewCard emoji="🦅" name="The Strategist" accentColor="#6b7b8b" />
		</div>

		{#if data.user}
			<a href="/chat" class="btn btn-primary btn-md sm:btn-lg">
				Convene the Council
			</a>
		{:else}
			<a href="/login" class="btn btn-primary btn-md sm:btn-lg">
				Convene the Council
			</a>
		{/if}
	</div>
</div>
