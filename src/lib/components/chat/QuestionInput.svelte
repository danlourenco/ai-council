<script lang="ts">
	interface Props {
		onSubmit: (text: string) => void;
		disabled?: boolean;
		placeholder?: string;
	}

	let { onSubmit, disabled = false, placeholder = 'Ask the council...' }: Props = $props();

	let text = $state('');
	let textareaEl: HTMLTextAreaElement;

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!text.trim() || disabled) return;

		onSubmit(text.trim());
		text = '';

		// Reset textarea height
		if (textareaEl) {
			textareaEl.style.height = 'auto';
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(e as unknown as SubmitEvent);
		}
	}

	function autoResize() {
		if (textareaEl) {
			textareaEl.style.height = 'auto';
			textareaEl.style.height = Math.min(textareaEl.scrollHeight, 200) + 'px';
		}
	}
</script>

<form onsubmit={handleSubmit} class="w-full">
	<div class="join w-full">
		<textarea
			bind:this={textareaEl}
			bind:value={text}
			onkeydown={handleKeydown}
			oninput={autoResize}
			class="textarea textarea-bordered join-item flex-1 min-h-[48px] max-h-[200px] resize-none"
			{placeholder}
			{disabled}
			rows="1"
		></textarea>
		<button
			type="submit"
			class="btn btn-primary join-item"
			disabled={disabled || !text.trim()}
		>
			{#if disabled}
				<span class="loading loading-spinner loading-sm"></span>
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
					/>
				</svg>
			{/if}
		</button>
	</div>
</form>
