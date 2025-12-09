import { streamText, convertToModelMessages } from 'ai';
import { getModel } from '$lib/server/ai/providers';
import { PersonaService } from '$lib/server/services/personas';
import { ConversationService } from '$lib/server/services/conversations';
import { MessageService } from '$lib/server/services/messages';
import type { ConversationMode } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

/**
 * Additional system prompt instructions for Brain Trust mode.
 * Instructs the advisor to consider and respond to other advisors' perspectives.
 */
const BRAIN_TRUST_ADDENDUM = `

IMPORTANT: You are participating in a "Brain Trust" discussion with other advisors.
If you see responses from other advisors in the conversation:
- Acknowledge their perspectives where relevant
- Offer your unique viewpoint that adds to or contrasts with what's been said
- Don't simply repeat what others have already covered
- Feel free to respectfully disagree or challenge other advisors' positions
- Build on good ideas from others while adding your own expertise`;

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	console.log('[chat] POST request received');

	try {
		if (!locals.user) {
			console.log('[chat] Unauthorized - no user');
			return new Response('Unauthorized', { status: 401 });
		}

		const body = (await request.json()) as {
			conversationId?: string;
			personaId: string;
			mode?: ConversationMode;
			parentMessageId?: string;
			messages?: unknown[];
		};
		console.log('[chat] Request body:', JSON.stringify(body, null, 2));
		const { conversationId, personaId, mode, parentMessageId } = body;

		// Get messages from request body
		const rawMessages = body.messages;
		console.log('[chat] Raw messages:', JSON.stringify(rawMessages, null, 2));

		if (!rawMessages || rawMessages.length === 0) {
			console.log('[chat] No messages in request');
			return new Response('No messages provided', { status: 400 });
		}

		// Detect message format and convert appropriately
		// UI messages from @ai-sdk/svelte Chat have 'parts' array
		// Simple messages from Brain Trust have 'content' string directly
		const isUIFormat = rawMessages[0]?.parts !== undefined;
		console.log('[chat] Message format:', isUIFormat ? 'UI (parts)' : 'Simple (content)');

		let modelMessages;
		let lastUserContent: string;

		if (isUIFormat) {
			// Convert UI messages to model messages using the AI SDK's built-in function
			modelMessages = convertToModelMessages(rawMessages as any);
			// Extract text content from the last user message
			const lastUserMessage = rawMessages
				.filter((m: { role: string }) => m.role === 'user')
				.pop() as { parts?: Array<{ type: string; text?: string }> } | undefined;
			lastUserContent =
				lastUserMessage?.parts?.find((p) => p.type === 'text')?.text || '';
		} else {
			// Simple format: convert directly to model messages
			modelMessages = rawMessages.map((m: { role: string; content: string }) => ({
				role: m.role as 'user' | 'assistant',
				content: m.content
			}));
			// Extract text content from the last user message
			const lastUserMessage = rawMessages
				.filter((m: { role: string }) => m.role === 'user')
				.pop() as { content?: string } | undefined;
			lastUserContent = lastUserMessage?.content || '';
		}

		console.log('[chat] Model messages:', JSON.stringify(modelMessages, null, 2));

		const personaService = new PersonaService(locals.db);
		const conversationService = new ConversationService(locals.db);
		const messageService = new MessageService(locals.db);

		// Get persona for system prompt
		console.log('[chat] Looking up persona:', personaId);
		const persona = await personaService.get(personaId);

		if (!persona) {
			console.log('[chat] Persona not found:', personaId);
			return new Response('Persona not found', { status: 404 });
		}
		console.log('[chat] Found persona:', persona.name);

		// Create or get conversation
		let convId = conversationId;
		let userMessageId: string | undefined;
		if (!convId) {
			const title = lastUserContent.slice(0, 100) || 'New Conversation';
			const conversation = await conversationService.create(
				{ title, mode: mode ?? 'quick' },
				locals.user.id
			);
			convId = conversation.id;
		} else {
			// Touch the conversation to update its timestamp
			await conversationService.touch(convId);
		}

		// Save user message (only if not already saved, i.e., no parentMessageId provided)
		// In Brain Trust mode, the user message is saved once and parentMessageId is passed for subsequent advisor calls
		if (lastUserContent && !parentMessageId) {
			const userMessage = await messageService.create(
				{
					conversationId: convId,
					role: 'user',
					content: lastUserContent
				},
				locals.user.id
			);
			userMessageId = userMessage.id;
		}

		// Get environment variables from platform
		const env = {
			ANTHROPIC_API_KEY: platform?.env?.ANTHROPIC_API_KEY ?? '',
			OPENAI_API_KEY: platform?.env?.OPENAI_API_KEY ?? '',
			GOOGLE_AI_API_KEY: platform?.env?.GOOGLE_AI_API_KEY ?? ''
		};

		// Stream response
		console.log('[chat] Getting model:', persona.defaultModelId);
		console.log('[chat] API keys present:', {
			anthropic: !!env.ANTHROPIC_API_KEY,
			openai: !!env.OPENAI_API_KEY,
			google: !!env.GOOGLE_AI_API_KEY
		});

		const model = getModel(persona.defaultModelId, env);
		console.log('[chat] Starting streamText');

		// Determine the parent message ID for this advisor response
		// Either use the provided parentMessageId (for Brain Trust mode) or the newly created user message
		const advisorParentMessageId = parentMessageId ?? userMessageId;

		// In Brain Trust mode, add instructions to consider other advisors' perspectives
		const systemPrompt =
			mode === 'brain-trust'
				? persona.systemPrompt + BRAIN_TRUST_ADDENDUM
				: persona.systemPrompt;

		let advisorMessageId: string | undefined;
		let streamError: Error | null = null;

		const result = streamText({
			model,
			system: systemPrompt,
			messages: modelMessages,
			onError: ({ error }) => {
				console.error(`[chat] Stream error from ${persona.name} (${persona.defaultModelId}):`, error);
				streamError = error instanceof Error ? error : new Error(String(error));
			},
			onFinish: async ({ text, totalUsage, finishReason }) => {
				console.log(`[chat] Stream finished for ${persona.name}:`, {
					textLength: text.length,
					finishReason,
					hasError: !!streamError
				});

				// Don't save empty responses (likely errors)
				if (!text || text.trim() === '') {
					console.warn(`[chat] Empty response from ${persona.name}, not saving`);
					return;
				}

				// Save assistant message after stream completes
				const advisorMessage = await messageService.create(
					{
						conversationId: convId!,
						role: 'advisor',
						content: text,
						modelId: persona.defaultModelId,
						personaId: persona.id,
						parentMessageId: advisorParentMessageId,
						metadata: {
							inputTokens: totalUsage?.inputTokens,
							outputTokens: totalUsage?.outputTokens
						}
					},
					locals.user!.id
				);
				advisorMessageId = advisorMessage.id;
			}
		});

		// Return streaming response with persona metadata
		console.log('[chat] Building response with metadata:', {
			personaId: persona.id,
			conversationId: convId,
			userMessageId: userMessageId ?? parentMessageId
		});

		const response = result.toUIMessageStreamResponse({
			messageMetadata: ({ part }) => {
				console.log('[chat] messageMetadata callback, part type:', part.type);
				if (part.type === 'start') {
					const metadata = {
						personaId: persona.id,
						conversationId: convId,
						// Include userMessageId so the client knows the parent for Brain Trust mode
						userMessageId: userMessageId ?? parentMessageId
					};
					console.log('[chat] Returning start metadata:', metadata);
					return metadata;
				}
			}
		});

		// Add conversation ID and user message ID to response headers
		const headers = new Headers(response.headers);
		headers.set('X-Conversation-Id', convId);
		if (userMessageId) {
			headers.set('X-User-Message-Id', userMessageId);
		}

		return new Response(response.body, {
			status: response.status,
			headers
		});
	} catch (error) {
		console.error('[chat] Error:', error);
		const message = error instanceof Error ? error.message : 'Unknown error';
		const stack = error instanceof Error ? error.stack : '';
		console.error('[chat] Stack:', stack);
		return new Response(JSON.stringify({ error: message, stack }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
