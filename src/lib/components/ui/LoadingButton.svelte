<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		loading?: boolean;
		disabled?: boolean;
		type?: 'button' | 'submit';
		variant?: 'primary' | 'secondary' | 'ghost' | 'error';
		size?: 'sm' | 'md' | 'lg';
		fullWidth?: boolean;
		onclick?: () => void;
		children: Snippet;
		icon?: Snippet;
	}

	let {
		loading = false,
		disabled = false,
		type = 'button',
		variant = 'primary',
		size = 'md',
		fullWidth = false,
		onclick,
		children,
		icon
	}: Props = $props();

	const variantClass = $derived({
		primary: 'btn-primary',
		secondary: 'btn-secondary',
		ghost: 'btn-ghost',
		error: 'btn-error'
	}[variant]);

	const sizeClass = $derived({
		sm: 'btn-sm',
		md: '',
		lg: 'btn-lg'
	}[size]);
</script>

<button
	{type}
	class="btn {variantClass} {sizeClass}"
	class:w-full={fullWidth}
	disabled={loading || disabled}
	{onclick}
>
	{#if loading}
		<span class="loading loading-spinner loading-sm"></span>
	{:else if icon}
		{@render icon()}
	{/if}
	{@render children()}
</button>
