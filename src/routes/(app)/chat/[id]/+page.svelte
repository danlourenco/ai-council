<script lang="ts">
	import ChatView from '$lib/components/chat/ChatView.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.conversation.title} - The Council</title>
</svelte:head>

<!--
	Key block forces ChatView to be recreated when conversation ID changes.
	This ensures the Chat instance is properly reinitialized with the new messages.
-->
{#key data.conversation.id}
	<ChatView
		personas={data.personas}
		conversationId={data.conversation.id}
		initialMessages={data.messages}
		initialMode={data.conversation.mode}
	/>
{/key}
