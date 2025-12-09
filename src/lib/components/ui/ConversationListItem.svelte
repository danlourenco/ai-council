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
	Flexbox layout ensures delete button is always visible and clickable.
	The title truncates while the button maintains fixed width.
-->
<li class="group py-1 px-0">
	<a
		{href}
		class="flex items-center gap-1 w-full"
		onclick={handleLinkClick}
	>
		<span
			class="flex-1 min-w-0 truncate text-sm hover:text-primary transition-colors"
			class:text-primary={active}
			class:font-medium={active}
			title={title}
		>
			{title}
		</span>
		{#if onDelete}
			<button
				type="button"
				data-delete-btn
				class="shrink-0 btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100 transition-opacity"
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
	</a>
</li>
