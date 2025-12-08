<script lang="ts">
	interface Props {
		id: string;
		title: string;
		href: string;
		active?: boolean;
		onDelete?: (id: string) => void;
		onclick?: () => void;
	}

	let { id, title, href, active = false, onDelete, onclick }: Props = $props();

	function handleDelete(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		onDelete?.(id);
	}

	function handleLinkClick(e: MouseEvent) {
		// Check if the click was on the delete button
		const target = e.target as HTMLElement;
		if (target.closest('[data-delete-btn]')) {
			e.preventDefault();
		} else {
			onclick?.();
		}
	}
</script>

<!--
	Anchor wraps the row content with delete button positioned absolutely.
	Click detection prevents navigation when delete button is clicked.
-->
<li class="list-row group py-1 px-0">
	<div></div>
	<div class="relative">
		<a
			{href}
			class="block truncate text-sm hover:text-primary transition-colors pr-8"
			class:text-primary={active}
			class:font-medium={active}
			title={title}
			onclick={handleLinkClick}
		>
			{title}
		</a>
		{#if onDelete}
			<button
				type="button"
				data-delete-btn
				class="absolute right-0 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100 transition-opacity"
				onclick={handleDelete}
				title="Delete conversation"
				aria-label="Delete conversation"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="size-4"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		{/if}
	</div>
</li>
