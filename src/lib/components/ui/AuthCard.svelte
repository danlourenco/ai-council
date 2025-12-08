<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		subtitle?: string;
		children: Snippet;
		footer?: Snippet;
	}

	let { title, subtitle, children, footer }: Props = $props();
</script>

<div class="min-h-screen bg-base-200 flex items-center justify-center p-4">
	<div class="card bg-base-100 shadow-xl w-full max-w-md">
		<div class="card-body">
			<h1 class="text-3xl font-bold text-center mb-2">{title}</h1>
			{#if subtitle}
				<p class="text-center text-base-content/70 mb-6">{subtitle}</p>
			{/if}

			{@render children()}

			{#if footer}
				<div class="divider">or</div>
				{@render footer()}
			{/if}
		</div>
	</div>
</div>
