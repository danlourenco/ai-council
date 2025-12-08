<script lang="ts">
	interface Props {
		type?: 'error' | 'warning' | 'info' | 'success';
		message: string;
		dismissible?: boolean;
		onDismiss?: () => void;
	}

	let { type = 'error', message, dismissible = false, onDismiss }: Props = $props();

	const alertClass = $derived({
		error: 'alert-error',
		warning: 'alert-warning',
		info: 'alert-info',
		success: 'alert-success'
	}[type]);
</script>

{#if message}
	<div class="alert {alertClass} mb-4">
		<span>{message}</span>
		{#if dismissible && onDismiss}
			<button class="btn btn-ghost btn-xs btn-circle" onclick={onDismiss}>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		{/if}
	</div>
{/if}
