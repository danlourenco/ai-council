<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>The Council</title>
</svelte:head>

<div class="min-h-screen bg-base-200 flex flex-col items-center justify-center p-8">
	<div class="text-center max-w-2xl">
		<h1 class="text-5xl font-bold text-base-content mb-4">The Council</h1>
		<p class="text-xl text-ink-muted mb-8">
			Your personal advisory council of AI perspectives
		</p>

		<div class="flex gap-4 justify-center mb-12">
			<div class="card bg-base-100 shadow-lg border-l-4 border-sage p-4 w-32">
				<span class="text-3xl mb-2">🦉</span>
				<span class="text-sm font-medium">The Sage</span>
			</div>
			<div class="card bg-base-100 shadow-lg border-l-4 border-plum p-4 w-32">
				<span class="text-3xl mb-2">🦊</span>
				<span class="text-sm font-medium">The Skeptic</span>
			</div>
			<div class="card bg-base-100 shadow-lg border-l-4 border-slate p-4 w-32">
				<span class="text-3xl mb-2">🦅</span>
				<span class="text-sm font-medium">The Strategist</span>
			</div>
		</div>

		{#if data.user}
			<a href="/chat" class="btn btn-primary btn-lg">
				Convene the Council
			</a>
		{:else}
			<a href="/login" class="btn btn-primary btn-lg">
				Convene the Council
			</a>
		{/if}
	</div>
</div>
