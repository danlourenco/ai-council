<script lang="ts">
	interface Props {
		emoji: string;
		name: string;
		accentColor?: string;
	}

	let { emoji, name, accentColor = '#7d9a78' }: Props = $props();
</script>

<div
	class="card bg-base-100 shadow-lg border-l-4 p-3 sm:p-4 w-24 sm:w-32 text-center"
	style="border-left-color: {accentColor}"
>
	<span class="text-2xl sm:text-3xl mb-1 sm:mb-2">{emoji}</span>
	<span class="text-xs sm:text-sm font-medium">{name}</span>
</div>
