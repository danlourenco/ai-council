<script lang="ts">
	import { Chat } from '@ai-sdk/svelte';
	import { DefaultChatTransport } from 'ai';
	import { goto, invalidateAll, replaceState } from '$app/navigation';
	import AdvisorCard from './AdvisorCard.svelte';
	import QuestionInput from './QuestionInput.svelte';
	import PersonaSelector from './PersonaSelector.svelte';
	import ModeSelector from './ModeSelector.svelte';
	import SynthesisCard from './SynthesisCard.svelte';
	import type { Persona, Message as DbMessage, ConversationMode } from '$lib/server/db/schema';
	import type { CouncilSynthesis } from '$lib/server/ai/council-agent';

	interface Props {
		personas: Persona[];
		conversationId?: string | null;
		initialMessages?: DbMessage[];
		initialMode?: ConversationMode;
	}

	let { personas, conversationId = null, initialMessages = [], initialMode = 'quick' }: Props = $props();

	// ═══════════════════════════════════════════════════════════════════
	// Mode & Conversation State
	// ═══════════════════════════════════════════════════════════════════

	let mode = $state<ConversationMode>(initialMode);
	let currentConversationId = $state<string | null>(conversationId ?? null);

	// ═══════════════════════════════════════════════════════════════════
	// Persona Selection State (Quick mode only)
	// ═══════════════════════════════════════════════════════════════════

	const defaultPersonaId = $derived(personas[0]?.id ?? '');
	let selectedPersonaId = $state('');

	// Initialize selected persona for quick mode
	$effect(() => {
		if (!selectedPersonaId && defaultPersonaId) {
			selectedPersonaId = defaultPersonaId;
		}
	});

	const selectedPersona = $derived(
		personas.find((p) => p.id === (selectedPersonaId || defaultPersonaId))
	);

	// ═══════════════════════════════════════════════════════════════════
	// Quick Mode - AI SDK Chat Class
	// ═══════════════════════════════════════════════════════════════════

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

	function createTransport() {
		return new DefaultChatTransport({
			api: '/api/chat',
			body: () => ({
				personaId: selectedPersonaId || defaultPersonaId,
				conversationId: currentConversationId
			})
		});
	}

	let chat = $state<Chat<UIMessage>>(
		new Chat<UIMessage>({
			transport: createTransport(),
			messages: convertDbMessagesToUi(initialMessages)
		})
	);

	// Watch for conversation ID in quick mode response metadata
	$effect(() => {
		if (mode !== 'quick') return;
		const messages = chat.messages;
		for (const message of messages) {
			const msgConvId = message.metadata?.conversationId;
			if (msgConvId && !currentConversationId) {
				currentConversationId = msgConvId;
				goto(`/chat/${msgConvId}`, { replaceState: true });
				break;
			}
		}
	});

	// ═══════════════════════════════════════════════════════════════════
	// Brain Trust Mode - Council Agent State
	// ═══════════════════════════════════════════════════════════════════

	type BrainTrustMessage = {
		id: string;
		role: 'user' | 'advisor';
		content: string;
		personaId?: string;
	};

	let brainTrustMessages = $state<BrainTrustMessage[]>([]);
	let brainTrustSynthesis = $state<CouncilSynthesis | null>(null);
	let brainTrustStatus = $state<'idle' | 'loading' | 'error'>('idle');
	let brainTrustError = $state<string | null>(null);

	// Load initial messages for brain-trust mode when viewing saved conversation
	$effect(() => {
		if (mode === 'brain-trust' && initialMessages.length > 0 && brainTrustMessages.length === 0) {
			// Load user and advisor messages
			brainTrustMessages = initialMessages
				.filter((msg) => msg.role === 'user' || msg.role === 'advisor')
				.map((msg) => ({
					id: msg.id,
					role: msg.role as 'user' | 'advisor',
					content: msg.content,
					personaId: msg.personaId ?? undefined
				}));

			// Load synthesis if exists (handle both old markdown and new JSON format)
			const synthesisMsg = initialMessages.find((msg) => msg.role === 'synthesis');
			if (synthesisMsg?.content) {
				try {
					// Try parsing as JSON first (new format)
					brainTrustSynthesis = JSON.parse(synthesisMsg.content);
				} catch (e) {
					// If JSON parse fails, it's an old markdown synthesis - ignore it
					console.log('[ChatView] Skipping old markdown synthesis format');
					brainTrustSynthesis = null;
				}
			}
		}
	});

	async function startCouncilSession(question: string) {
		brainTrustStatus = 'loading';
		brainTrustError = null;

		// Add user message to UI immediately
		const userMessage: BrainTrustMessage = {
			id: 'temp-user',
			role: 'user',
			content: question
		};
		brainTrustMessages = [...brainTrustMessages, userMessage];

		try {
			const response = await fetch('/api/council', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					question,
					conversationId: currentConversationId
				})
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(error || 'Failed to get council response');
			}

			// Parse SSE stream
			const reader = response.body?.getReader();
			const decoder = new TextDecoder();

			if (!reader) {
				throw new Error('No response body');
			}

			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = line.slice(6);

						if (data === '[DONE]') {
							brainTrustStatus = 'idle';
							await invalidateAll();
							continue;
						}

						try {
							const event = JSON.parse(data);

							if (event.type === 'metadata') {
								if (event.conversationId && !currentConversationId) {
									currentConversationId = event.conversationId;
									replaceState(`/chat/${event.conversationId}`, {});
								}
								if (event.userMessageId) {
									userMessage.id = event.userMessageId;
								}
							} else if (event.type === 'advisor-response') {
								const advisor = event.advisor;
								const persona = personas.find((p) => p.name === advisor.advisorName);
								const advisorMessage: BrainTrustMessage = {
									id: `${userMessage.id}-${advisor.advisorName}`,
									role: 'advisor',
									content: advisor.response,
									personaId: persona?.id
								};
								brainTrustMessages = [...brainTrustMessages, advisorMessage];
							} else if (event.type === 'synthesis') {
								brainTrustSynthesis = event.synthesis;
							} else if (event.type === 'error') {
								throw new Error(event.error);
							}
						} catch (parseError) {
							console.error('[ChatView] Failed to parse event:', parseError);
						}
					}
				}
			}
		} catch (error) {
			brainTrustStatus = 'error';
			brainTrustError = error instanceof Error ? error.message : 'Unknown error';
			console.error('[ChatView] Council error:', error);
		}
	}

	// ═══════════════════════════════════════════════════════════════════
	// Derived State for UI
	// ═══════════════════════════════════════════════════════════════════

	// Check if we're in an active brain trust session
	const isBrainTrustActive = $derived(brainTrustStatus === 'loading');

	// Whether the input should be disabled
	const isInputDisabled = $derived(
		(mode === 'quick' && (chat.status === 'streaming' || chat.status === 'submitted')) ||
			(mode === 'brain-trust' && brainTrustStatus === 'loading')
	);

	// ═══════════════════════════════════════════════════════════════════
	// Event Handlers
	// ═══════════════════════════════════════════════════════════════════

	function handleQuestionSubmit(text: string) {
		if (mode === 'quick') {
			chat.sendMessage({ text });
		} else if (mode === 'brain-trust') {
			startCouncilSession(text);
		}
	}

	function selectPersona(id: string) {
		selectedPersonaId = id;
	}

	function handleModeChange(newMode: ConversationMode) {
		mode = newMode;
	}

	function startNewChat() {
		// Reset brain trust state
		brainTrustMessages = [];
		brainTrustSynthesis = null;
		brainTrustStatus = 'idle';
		brainTrustError = null;

		// Reset quick mode
		chat = new Chat<UIMessage>({
			transport: createTransport(),
			messages: []
		});

		currentConversationId = null;
		goto('/chat');
	}

	// ═══════════════════════════════════════════════════════════════════
	// Helper Functions
	// ═══════════════════════════════════════════════════════════════════

	function getMessageText(message: UIMessage): string {
		return message.parts
			.filter((part): part is { type: 'text'; text: string } => part.type === 'text')
			.map((part) => part.text)
			.join('');
	}

	function getPersonaForMessage(message: UIMessage) {
		const personaId = message.metadata?.personaId;
		if (personaId) {
			return personas.find((p) => p.id === personaId);
		}
		return selectedPersona;
	}

	function getPersonaById(id: string) {
		return personas.find((p) => p.id === id);
	}

	// Get the placeholder text based on mode
	const inputPlaceholder = $derived(
		mode === 'brain-trust' ? 'Ask the council...' : `Ask ${selectedPersona?.name ?? 'the council'}...`
	);

	// Check if we have any messages to display
	const hasMessages = $derived(
		(mode === 'quick' && chat.messages.length > 0) ||
			(mode === 'brain-trust' && brainTrustMessages.length > 0)
	);
</script>

<div class="flex flex-col h-full">
	<!-- Header -->
	<header class="p-2 sm:p-4 border-b border-base-300 bg-base-100 space-y-3">
		<div class="flex items-center justify-between gap-2">
			<ModeSelector {mode} onSelect={handleModeChange} disabled={isBrainTrustActive} />
		</div>

		<!-- Persona Selector (Quick mode only) -->
		{#if mode === 'quick'}
			<PersonaSelector
				{personas}
				selected={selectedPersonaId || defaultPersonaId}
				onSelect={selectPersona}
			/>
		{/if}
	</header>

	<!-- Messages -->
	<div class="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4">
		<!-- Error Display -->
		{#if mode === 'quick' && chat.error}
			<div class="alert alert-error">
				<span>Error: {chat.error.message}</span>
			</div>
		{:else if mode === 'brain-trust' && brainTrustError}
			<div class="alert alert-error">
				<span>Error: {brainTrustError}</span>
			</div>
		{/if}

		<!-- Empty State -->
		{#if !hasMessages}
			<div class="flex flex-col items-center justify-center h-full text-center px-4">
				{#if mode === 'quick'}
					<div class="text-5xl sm:text-6xl mb-4">{selectedPersona?.avatarEmoji ?? '🦉'}</div>
					<h3 class="text-lg sm:text-xl font-semibold mb-2">
						Ask {selectedPersona?.name ?? 'the Council'}
					</h3>
					<p class="text-sm sm:text-base text-base-content/60 max-w-md">
						{selectedPersona?.role ?? 'Get balanced, thoughtful guidance on your questions.'}
					</p>
				{:else if mode === 'brain-trust'}
					<div class="text-5xl sm:text-6xl mb-4">🧠</div>
					<h3 class="text-lg sm:text-xl font-semibold mb-2">Brain Trust</h3>
					<p class="text-sm sm:text-base text-base-content/60 max-w-md">
						Consult all three default advisors (The Sage, The Skeptic, and The Strategist).
						They will respond in sequence, with each able to see and reference previous responses.
					</p>
				{/if}
			</div>

			<!-- Quick Mode Messages -->
		{:else if mode === 'quick'}
			{#each chat.messages as message (message.id)}
				{#if message.role === 'user'}
					<div class="chat chat-end">
						<div class="chat-bubble chat-bubble-primary text-sm sm:text-base">
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

			<!-- Brain Trust Messages -->
		{:else if mode === 'brain-trust'}
			<!-- Messages -->
			{#each brainTrustMessages as message (message.id)}
				{#if message.role === 'user'}
					<div class="chat chat-end">
						<div class="chat-bubble chat-bubble-primary text-sm sm:text-base">
							{message.content}
						</div>
					</div>
				{:else if message.role === 'advisor'}
					<AdvisorCard
						persona={message.personaId ? getPersonaById(message.personaId) : undefined}
						content={message.content}
						isStreaming={false}
					/>
				{/if}
			{/each}

			<!-- Loading Indicator -->
			{#if brainTrustStatus === 'loading'}
				<div class="flex flex-col items-center justify-center py-8 gap-3">
					<span class="loading loading-spinner loading-lg"></span>
					<p class="text-sm text-base-content/60">Consulting the council...</p>
				</div>
			{/if}

			<!-- Error Display -->
			{#if brainTrustStatus === 'error' && brainTrustError}
				<div class="alert alert-error">
					<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
					<span>{brainTrustError}</span>
				</div>
			{/if}

			<!-- Synthesis -->
			{#if brainTrustSynthesis}
				<SynthesisCard
					synthesis={brainTrustSynthesis}
					isStreaming={false}
					participatingPersonas={personas.filter((p) => p.isDefault)}
				/>
			{/if}
		{/if}
	</div>

	<!-- Input -->
	<footer class="p-2 sm:p-4 border-t border-base-300 bg-base-100">
		<QuestionInput onSubmit={handleQuestionSubmit} disabled={isInputDisabled} placeholder={inputPlaceholder} />
	</footer>
</div>
