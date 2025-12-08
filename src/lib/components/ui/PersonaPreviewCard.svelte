<script lang="ts">
	interface Props {
		emoji: string;
		name: string;
		accentColor?: string;
	}

	let { emoji, name, accentColor = '#7d9a78' }: Props = $props();
</script>

<div
	class="card bg-base-100 shadow-lg border-l-4 p-4 w-32 text-center"
	style="border-left-color: {accentColor}"
>
	<span class="text-3xl mb-2">{emoji}</span>
	<span class="text-sm font-medium">{name}</span>
</div>
