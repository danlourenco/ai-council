<script lang="ts">
	import { Chat } from '@ai-sdk/svelte';
	import { DefaultChatTransport } from 'ai';
	import { goto, invalidateAll, replaceState } from '$app/navigation';
	import AdvisorCard from './AdvisorCard.svelte';
	import QuestionInput from './QuestionInput.svelte';
	import PersonaSelector from './PersonaSelector.svelte';
	import ModeSelector from './ModeSelector.svelte';
	import SynthesisCard from './SynthesisCard.svelte';
	import { BrainTrust, parseAISDKStream } from '$lib/brain-trust';
	import type { Persona, Message as DbMessage, ConversationMode } from '$lib/server/db/schema';
	import type { Advisor } from '$lib/brain-trust';

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
	// Persona Selection State
	// ═══════════════════════════════════════════════════════════════════

	const defaultPersonaId = $derived(personas[0]?.id ?? '');
	let selectedPersonaId = $state('');
	let selectedPersonaIds = $state<string[]>([]);

	// Initialize selected persona for quick mode
	$effect(() => {
		if (!selectedPersonaId && defaultPersonaId) {
			selectedPersonaId = defaultPersonaId;
		}
	});

	// Initialize multi-select when starting in brain-trust mode
	$effect(() => {
		if (initialMode === 'brain-trust' && selectedPersonaIds.length === 0) {
			selectedPersonaIds = personas.map((p) => p.id);
		}
	});

	// Load initial messages into Brain Trust when viewing a saved conversation
	$effect(() => {
		if (initialMode === 'brain-trust' && initialMessages.length > 0 && brainTrust.messages.length === 0) {
			// Convert DB messages to Brain Trust format
			const btMessages = initialMessages
				.filter((msg) => msg.role !== 'synthesis')
				.map((msg) => ({
					id: msg.id,
					role: msg.role as 'user' | 'advisor',
					content: msg.content,
					advisorId: msg.personaId ?? undefined
				}));

			// Find synthesis message if exists
			const synthesisMsg = initialMessages.find((msg) => msg.role === 'synthesis');

			brainTrust.loadMessages(btMessages, synthesisMsg?.content);
			console.log('[ChatView] Loaded Brain Trust messages from DB:', btMessages.length, 'synthesis:', !!synthesisMsg);
		}
	});

	const selectedPersona = $derived(
		personas.find((p) => p.id === (selectedPersonaId || defaultPersonaId))
	);

	// Get personas for brain trust in order
	const selectedPersonasForBrainTrust = $derived(
		selectedPersonaIds.map((id) => personas.find((p) => p.id === id)).filter(Boolean) as Persona[]
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
	// Brain Trust Mode - BrainTrust Class
	// ═══════════════════════════════════════════════════════════════════

	// Track the database user message ID (captured from first advisor response)
	let dbUserMessageId = $state<string | null>(null);

	const brainTrust = new BrainTrust({
		fetchAdvisor: async (advisor, messages) => {
			// First advisor call saves the user message and returns the ID
			// Subsequent calls pass the parentMessageId to link responses
			const isFirstAdvisor = !dbUserMessageId;

			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					personaId: advisor.id,
					messages: messages.map((m) => ({
						role: m.role === 'advisor' ? 'assistant' : m.role,
						content: m.content
					})),
					mode: 'brain-trust',
					conversationId: currentConversationId,
					// Pass parent message ID for subsequent advisors
					parentMessageId: isFirstAdvisor ? undefined : dbUserMessageId
				})
			});

			// Extract IDs from response headers
			if (response.ok) {
				const convIdHeader = response.headers.get('X-Conversation-Id');
				const userMsgIdHeader = response.headers.get('X-User-Message-Id');

				if (convIdHeader && !currentConversationId) {
					currentConversationId = convIdHeader;
				}

				if (userMsgIdHeader && !dbUserMessageId) {
					dbUserMessageId = userMsgIdHeader;
				}
			}

			return response;
		},
		fetchSynthesis: async () => {
			if (!dbUserMessageId) {
				throw new Error('No user message ID available for synthesis');
			}

			return fetch('/api/chat/synthesis', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					conversationId: currentConversationId,
					userQuestionId: dbUserMessageId
				})
			});
		},
		parseStream: parseAISDKStream,
		onError: (error, phase, advisor) => {
			console.error(`[BrainTrust] Error in ${phase}:`, advisor?.name, error);
		},
		onSynthesisComplete: () => {
			// Update URL after brain trust completes (not during streaming)
			if (currentConversationId) {
				replaceState(`/chat/${currentConversationId}`, {});
				// Refresh sidebar to show new conversation
				invalidateAll();
			}
		}
	});

	// ═══════════════════════════════════════════════════════════════════
	// Derived State for UI
	// ═══════════════════════════════════════════════════════════════════

	// Check if we're in an active brain trust session
	const isBrainTrustActive = $derived(brainTrust.status !== 'idle');

	// Whether the input should be disabled
	const isInputDisabled = $derived(
		(mode === 'quick' && (chat.status === 'streaming' || chat.status === 'submitted')) ||
			(mode === 'brain-trust' && brainTrust.isActive)
	);

	// Minimum advisors for brain trust
	const canStartBrainTrust = $derived(selectedPersonaIds.length >= 2);

	// ═══════════════════════════════════════════════════════════════════
	// Event Handlers
	// ═══════════════════════════════════════════════════════════════════

	function handleQuestionSubmit(text: string) {
		if (mode === 'quick') {
			chat.sendMessage({ text });
		} else if (mode === 'brain-trust' && canStartBrainTrust) {
			// Convert personas to advisors
			const advisors: Advisor[] = selectedPersonasForBrainTrust.map((p) => ({
				id: p.id,
				name: p.name,
				systemPrompt: p.systemPrompt,
				modelId: p.defaultModelId,
				accentColor: p.accentColor,
				avatarEmoji: p.avatarEmoji,
				role: p.role
			}));

			brainTrust.start(text, advisors);
		}
	}

	function selectPersona(id: string) {
		selectedPersonaId = id;
	}

	function handleMultiSelect(ids: string[]) {
		selectedPersonaIds = ids;
	}

	function handleModeChange(newMode: ConversationMode) {
		mode = newMode;

		// Initialize multi-select with all personas when entering brain trust mode
		if (newMode === 'brain-trust' && selectedPersonaIds.length === 0) {
			selectedPersonaIds = personas.map((p) => p.id);
		}
	}

	function startNewChat() {
		brainTrust.reset();
		dbUserMessageId = null;
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
		mode === 'brain-trust'
			? canStartBrainTrust
				? 'Ask the council...'
				: 'Select at least 2 advisors'
			: `Ask ${selectedPersona?.name ?? 'the council'}...`
	);

	// Check if we have any messages to display
	const hasMessages = $derived(
		(mode === 'quick' && chat.messages.length > 0) ||
			(mode === 'brain-trust' && brainTrust.messages.length > 0)
	);
</script>

<div class="flex flex-col h-full">
	<!-- Header -->
	<header class="p-2 sm:p-4 border-b border-base-300 bg-base-100 space-y-3">
		<div class="flex items-center justify-between gap-2">
			<ModeSelector {mode} onSelect={handleModeChange} disabled={isBrainTrustActive} />
			{#if hasMessages || currentConversationId}
				<button class="btn btn-ghost btn-sm" onclick={startNewChat}>New Chat</button>
			{/if}
		</div>

		<!-- Persona Selector -->
		{#if mode === 'quick'}
			<PersonaSelector
				{personas}
				selected={selectedPersonaId || defaultPersonaId}
				onSelect={selectPersona}
			/>
		{:else if mode === 'brain-trust'}
			<PersonaSelector
				{personas}
				multiSelect={true}
				selectedIds={selectedPersonaIds}
				onMultiSelect={handleMultiSelect}
				disabled={isBrainTrustActive}
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
		{:else if mode === 'brain-trust' && brainTrust.error}
			<div class="alert alert-error">
				<span>Error: {brainTrust.error}</span>
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
						{#if selectedPersonaIds.length < 2}
							Select at least 2 advisors to consult. They will respond in order and can reference
							each other's perspectives.
						{:else}
							Your {selectedPersonaIds.length} advisors will respond in order. Each can see previous
							responses, enabling debate and critique.
						{/if}
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
			<!-- Completed Messages -->
			{#each brainTrust.messages as message (message.id)}
				{#if message.role === 'user'}
					<div class="chat chat-end">
						<div class="chat-bubble chat-bubble-primary text-sm sm:text-base">
							{message.content}
						</div>
					</div>
				{:else if message.role === 'advisor'}
					<AdvisorCard
						persona={message.advisorId ? getPersonaById(message.advisorId) : undefined}
						content={message.content}
						isStreaming={false}
					/>
				{/if}
			{/each}

			<!-- Currently Streaming Advisor -->
			{#if brainTrust.streamingAdvisorId}
				<AdvisorCard
					persona={getPersonaById(brainTrust.streamingAdvisorId)}
					content={brainTrust.streamingContent}
					isStreaming={true}
				/>
			{/if}

			<!-- Progress Indicator -->
			{#if brainTrust.status === 'querying' && !brainTrust.streamingAdvisorId}
				<div class="flex justify-center py-4">
					<span class="loading loading-spinner loading-md"></span>
				</div>
			{/if}

			<!-- Synthesis -->
			{#if brainTrust.synthesisContent || brainTrust.status === 'synthesizing'}
				<SynthesisCard
					content={brainTrust.synthesisContent}
					isStreaming={brainTrust.status === 'synthesizing'}
					participatingPersonas={selectedPersonasForBrainTrust}
				/>
			{/if}
		{/if}
	</div>

	<!-- Input -->
	<footer class="p-2 sm:p-4 border-t border-base-300 bg-base-100">
		<QuestionInput
			onSubmit={handleQuestionSubmit}
			disabled={isInputDisabled || (mode === 'brain-trust' && !canStartBrainTrust)}
			placeholder={inputPlaceholder}
		/>
	</footer>
</div>
