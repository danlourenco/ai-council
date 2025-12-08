<script lang="ts">
	import ChatView from '$lib/components/chat/ChatView.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>New Chat - The Council</title>
</svelte:head>

<ChatView personas={data.personas} />
