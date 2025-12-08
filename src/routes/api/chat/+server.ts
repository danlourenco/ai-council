import { streamText, convertToModelMessages } from 'ai';
import { getModel } from '$lib/server/ai/providers';
import { PersonaService } from '$lib/server/services/personas';
import { ConversationService } from '$lib/server/services/conversations';
import { MessageService } from '$lib/server/services/messages';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const body = await request.json();
	const { conversationId, personaId } = body as {
		conversationId?: string;
		personaId: string;
	};

	// Get messages from request body (UI messages from @ai-sdk/svelte Chat)
	const uiMessages = body.messages;

	// Convert UI messages to model messages using the AI SDK's built-in function
	const modelMessages = convertToModelMessages(uiMessages);

	// Extract text content from the last user message for conversation title/persistence
	const lastUserMessage = uiMessages.filter((m: { role: string }) => m.role === 'user').pop();
	const lastUserContent = lastUserMessage?.content || lastUserMessage?.parts?.find((p: { type: string }) => p.type === 'text')?.text || '';

	const personaService = new PersonaService(locals.db);
	const conversationService = new ConversationService(locals.db);
	const messageService = new MessageService(locals.db);

	// Get persona for system prompt
	const persona = await personaService.get(personaId);

	if (!persona) {
		return new Response('Persona not found', { status: 404 });
	}

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
	const model = getModel(persona.defaultModelId, env);
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

	// Return streaming response with conversation ID header
	const response = result.toUIMessageStreamResponse();

	// Add conversation ID to response headers
	const headers = new Headers(response.headers);
	headers.set('X-Conversation-Id', convId);

	return new Response(response.body, {
		status: response.status,
		headers
	});
};
