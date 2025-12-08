import { streamText, convertToModelMessages } from 'ai';
import { getModel } from '$lib/server/ai/providers';
import { PersonaService } from '$lib/server/services/personas';
import { ConversationService } from '$lib/server/services/conversations';
import { MessageService } from '$lib/server/services/messages';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	console.log('[chat] POST request received');

	try {
		if (!locals.user) {
			console.log('[chat] Unauthorized - no user');
			return new Response('Unauthorized', { status: 401 });
		}

		const body = await request.json();
		console.log('[chat] Request body:', JSON.stringify(body, null, 2));
		const { conversationId, personaId } = body as {
			conversationId?: string;
			personaId: string;
		};

		// Get messages from request body (UI messages from @ai-sdk/svelte Chat)
		const uiMessages = body.messages;
		console.log('[chat] UI messages:', JSON.stringify(uiMessages, null, 2));

		if (!uiMessages || uiMessages.length === 0) {
			console.log('[chat] No messages in request');
			return new Response('No messages provided', { status: 400 });
		}

		// Convert UI messages to model messages using the AI SDK's built-in function
		console.log('[chat] Converting messages...');
		const modelMessages = convertToModelMessages(uiMessages);
		console.log('[chat] Model messages:', JSON.stringify(modelMessages, null, 2));

		// Extract text content from the last user message for conversation title/persistence
		const lastUserMessage = uiMessages.filter((m: { role: string }) => m.role === 'user').pop();
		const lastUserContent =
			lastUserMessage?.content ||
			lastUserMessage?.parts?.find((p: { type: string }) => p.type === 'text')?.text ||
			'';

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
		if (!convId) {
			const title = lastUserContent.slice(0, 100) || 'New Conversation';
			const conversation = await conversationService.create(
				{ title, mode: 'quick' },
				locals.user.id
			);
			convId = conversation.id;
		} else {
			// Touch the conversation to update its timestamp
			await conversationService.touch(convId);
		}

		// Save user message
		if (lastUserContent) {
			await messageService.create(
				{
					conversationId: convId,
					role: 'user',
					content: lastUserContent
				},
				locals.user.id
			);
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
		const result = streamText({
			model,
			system: persona.systemPrompt,
			messages: modelMessages,
			onFinish: async ({ text, totalUsage }) => {
				// Save assistant message after stream completes
				await messageService.create(
					{
						conversationId: convId!,
						role: 'advisor',
						content: text,
						modelId: persona.defaultModelId,
						personaId: persona.id,
						metadata: {
							inputTokens: totalUsage?.inputTokens,
							outputTokens: totalUsage?.outputTokens
						}
					},
					locals.user!.id
				);
			}
		});

		// Return streaming response with persona metadata
		const response = result.toUIMessageStreamResponse({
			messageMetadata: ({ part }) => {
				if (part.type === 'start') {
					return {
						personaId: persona.id,
						conversationId: convId
					};
				}
			}
		});

		// Add conversation ID to response headers
		const headers = new Headers(response.headers);
		headers.set('X-Conversation-Id', convId);

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
