<script lang="ts">
	import { Chat } from '@ai-sdk/svelte';
	import { DefaultChatTransport } from 'ai';
	import { goto } from '$app/navigation';
	import AdvisorCard from './AdvisorCard.svelte';
	import QuestionInput from './QuestionInput.svelte';
	import PersonaSelector from './PersonaSelector.svelte';
	import type { Persona, Message as DbMessage } from '$lib/server/db/schema';

	interface Props {
		personas: Persona[];
		conversationId?: string | null;
		initialMessages?: DbMessage[];
	}

	let { personas, conversationId = null, initialMessages = [] }: Props = $props();

	// Track current conversation ID (may be set from prop or from first response)
	let currentConversationId = $state<string | null>(conversationId ?? null);

	// Default persona ID
	const defaultPersonaId = $derived(personas[0]?.id ?? '');
	let selectedPersonaId = $state('');

	// Initialize selected persona
	$effect(() => {
		if (!selectedPersonaId && defaultPersonaId) {
			selectedPersonaId = defaultPersonaId;
		}
	});

	const selectedPersona = $derived(
		personas.find((p) => p.id === (selectedPersonaId || defaultPersonaId))
	);

	// Message metadata type
	type MessageMetadata = {
		personaId?: string;
		conversationId?: string;
	};

	type UIMessage = {
		id: string;
		role: 'user' | 'assistant' | 'system';
		parts: Array<{ type: 'text'; text: string } | { type: string; [key: string]: unknown }>;
		metadata?: MessageMetadata;
	};

	// Convert database messages to UI format
	function convertDbMessagesToUi(dbMessages: DbMessage[]): UIMessage[] {
		return dbMessages.map((msg) => ({
			id: msg.id,
			role: msg.role === 'advisor' ? 'assistant' : (msg.role as 'user' | 'assistant'),
			parts: [{ type: 'text' as const, text: msg.content }],
			metadata: {
				personaId: msg.personaId ?? undefined
			}
		}));
	}

	// Create transport - needs to be reactive to currentConversationId
	function createTransport() {
		return new DefaultChatTransport({
			api: '/api/chat',
			body: () => ({
				personaId: selectedPersonaId || defaultPersonaId,
				conversationId: currentConversationId
			})
		});
	}

	// Create chat instance with initial messages
	let chat = $state<Chat<UIMessage>>(
		new Chat<UIMessage>({
			transport: createTransport(),
			messages: convertDbMessagesToUi(initialMessages)
		})
	);

	// Watch for conversation ID in response metadata and update URL
	$effect(() => {
		const messages = chat.messages;
		for (const message of messages) {
			const msgConvId = message.metadata?.conversationId;
			if (msgConvId && !currentConversationId) {
				currentConversationId = msgConvId;
				// Navigate to the conversation URL without full page reload
				goto(`/chat/${msgConvId}`, { replaceState: true });
				break;
			}
		}
	});

	function handleQuestionSubmit(text: string) {
		chat.sendMessage({ text });
	}

	function selectPersona(id: string) {
		selectedPersonaId = id;
	}

	function startNewChat() {
		goto('/chat');
	}

	// Helper to extract text content from message parts
	function getMessageText(message: UIMessage): string {
		return message.parts
			.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
			.map((part) => part.text)
			.join('');
	}

	// Get persona for a specific assistant message from its metadata
	function getPersonaForMessage(message: UIMessage) {
		const personaId = message.metadata?.personaId;
		if (personaId) {
			return personas.find((p) => p.id === personaId);
		}
		return selectedPersona;
	}
</script>

<div class="flex flex-col h-full">
	<!-- Header -->
	<header class="p-4 border-b border-base-300 bg-base-100">
		<div class="flex items-center justify-between">
			<PersonaSelector
				{personas}
				selected={selectedPersonaId || defaultPersonaId}
				onSelect={selectPersona}
			/>
			{#if chat.messages.length > 0 || currentConversationId}
				<button class="btn btn-ghost btn-sm" onclick={startNewChat}>New Chat</button>
			{/if}
		</div>
	</header>

	<!-- Messages -->
	<div class="flex-1 overflow-y-auto p-4 space-y-4">
		{#if chat.error}
			<div class="alert alert-error">
				<span>Error: {chat.error.message}</span>
			</div>
		{/if}

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
						persona={getPersonaForMessage(message)}
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
