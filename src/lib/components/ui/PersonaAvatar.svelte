<script lang="ts">
	interface Props {
		emoji: string;
		accentColor?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl';
	}

	let { emoji, accentColor = '#7d9a78', size = 'md' }: Props = $props();

	const sizeClasses = $derived({
		sm: 'w-8 h-8 text-lg',
		md: 'w-10 h-10 text-xl',
		lg: 'w-16 h-16 text-3xl',
		xl: 'w-20 h-20 text-4xl'
	}[size]);
</script>

<div
	class="rounded-full flex items-center justify-center {sizeClasses}"
	style="background-color: {accentColor}20"
>
	{emoji}
</div>
