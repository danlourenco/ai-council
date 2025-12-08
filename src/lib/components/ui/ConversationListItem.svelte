<script lang="ts">
	interface Props {
		id: string;
		title: string;
		href: string;
		active?: boolean;
	}

	let { id, title, href, active = false }: Props = $props();
</script>

<a
	{href}
	class="btn btn-ghost btn-sm btn-block justify-start text-left"
	class:btn-active={active}
	{title}
>
	<span class="truncate flex-1">{title}</span>
</a>
