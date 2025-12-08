<script lang="ts">
	import { Chat } from '@ai-sdk/svelte';
	import { DefaultChatTransport } from 'ai';
	import AdvisorCard from '$lib/components/chat/AdvisorCard.svelte';
	import QuestionInput from '$lib/components/chat/QuestionInput.svelte';
	import PersonaSelector from '$lib/components/chat/PersonaSelector.svelte';

	let { data } = $props();

	// Default persona ID - use state that can be updated
	const defaultPersonaId = $derived(data.personas[0]?.id ?? '');
	let selectedPersonaId = $state('');

	// Initialize selected persona on mount
	$effect(() => {
		if (!selectedPersonaId && defaultPersonaId) {
			selectedPersonaId = defaultPersonaId;
		}
	});

	const selectedPersona = $derived(
		data.personas.find((p) => p.id === (selectedPersonaId || defaultPersonaId))
	);

	// Track conversation ID from server response
	let conversationId = $state<string | null>(null);

	// Create chat transport with dynamic body
	const transport = new DefaultChatTransport({
		api: '/api/chat',
		body: () => ({
			personaId: selectedPersonaId || defaultPersonaId,
			conversationId
		})
	});

	// Create chat instance
	const chat = new Chat({
		transport
	});

	function handleQuestionSubmit(text: string) {
		chat.sendMessage({ text });
	}

	function selectPersona(id: string) {
		selectedPersonaId = id;
	}

	function startNewChat() {
		chat.messages = [];
		conversationId = null;
	}

	// Helper to extract text content from message parts
	function getMessageText(message: (typeof chat.messages)[0]): string {
		return message.parts
			.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
			.map((part) => part.text)
			.join('');
	}
</script>

<svelte:head>
	<title>Chat - The Council</title>
</svelte:head>

<div class="flex flex-col h-full">
	<!-- Header -->
	<header class="p-4 border-b border-base-300 bg-base-100">
		<div class="flex items-center justify-between">
			<PersonaSelector
				personas={data.personas}
				selected={selectedPersonaId || defaultPersonaId}
				onSelect={selectPersona}
			/>
			{#if chat.messages.length > 0}
				<button class="btn btn-ghost btn-sm" onclick={startNewChat}> New Chat </button>
			{/if}
		</div>
	</header>

	<!-- Messages -->
	<div class="flex-1 overflow-y-auto p-4 space-y-4">
		{#if chat.messages.length === 0}
			<div class="flex flex-col items-center justify-center h-full text-center">
				<div class="text-6xl mb-4">{selectedPersona?.avatarEmoji ?? '🦉'}</div>
				<h3 class="text-xl font-semibold mb-2">Ask {selectedPersona?.name ?? 'the Council'}</h3>
				<p class="text-base-content/60 max-w-md">
					{selectedPersona?.role ?? 'Get balanced, thoughtful guidance on your questions.'}
				</p>
			</div>
		{:else}
			{#each chat.messages as message (message.id)}
				{#if message.role === 'user'}
					<div class="chat chat-end">
						<div class="chat-bubble chat-bubble-primary">
							{getMessageText(message)}
						</div>
					</div>
				{:else if message.role === 'assistant'}
					<AdvisorCard
						persona={selectedPersona}
						content={getMessageText(message)}
						isStreaming={chat.status === 'streaming' &&
							message.id === chat.messages[chat.messages.length - 1]?.id}
					/>
				{/if}
			{/each}
		{/if}
	</div>

	<!-- Input -->
	<footer class="p-4 border-t border-base-300 bg-base-100">
		<QuestionInput
			onSubmit={handleQuestionSubmit}
			disabled={chat.status === 'streaming' || chat.status === 'submitted'}
			placeholder="Ask {selectedPersona?.name ?? 'the council'}..."
		/>
	</footer>
</div>
