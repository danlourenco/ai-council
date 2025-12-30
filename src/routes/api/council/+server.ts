import { createAgentUIStreamResponse } from 'ai';
import { createCouncilAgent } from '$lib/server/ai/council-agent';
import { PersonaService } from '$lib/server/services/personas';
import { ConversationService } from '$lib/server/services/conversations';
import { MessageService } from '$lib/server/services/messages';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	console.log('[council] POST request received');

	try {
		if (!locals.user) {
			console.log('[council] Unauthorized - no user');
			return new Response('Unauthorized', { status: 401 });
		}

		const body = (await request.json()) as {
			question: string;
			conversationId?: string;
		};

		const { question, conversationId } = body;

		if (!question) {
			return new Response('Missing required field: question', { status: 400 });
		}

		console.log('[council] Request:', { question: question.slice(0, 100), conversationId });

		// Get environment variables from platform
		const env = {
			ANTHROPIC_API_KEY: platform?.env?.ANTHROPIC_API_KEY ?? '',
			OPENAI_API_KEY: platform?.env?.OPENAI_API_KEY ?? '',
			GOOGLE_AI_API_KEY: platform?.env?.GOOGLE_AI_API_KEY ?? ''
		};

		const personaService = new PersonaService(locals.db);
		const conversationService = new ConversationService(locals.db);
		const messageService = new MessageService(locals.db);

		// Get default personas (Sage, Skeptic, Strategist)
		const personas = await personaService.getDefaults();
		console.log('[council] Found personas:', personas.map((p) => p.name).join(', '));

		// Create the council agent
		const agent = createCouncilAgent(personas, env);

		// Create or get conversation
		let convId = conversationId;
		if (!convId) {
			const conversation = await conversationService.create(
				{ title: question.slice(0, 100), mode: 'brain-trust' },
				locals.user.id
			);
			convId = conversation.id;
			console.log('[council] Created new conversation:', convId);
		} else {
			// Touch the conversation to update its timestamp
			await conversationService.touch(convId);
		}

		// Save user message
		const userMessage = await messageService.create(
			{
				conversationId: convId,
				role: 'user',
				content: question
			},
			locals.user.id
		);
		console.log('[council] Saved user message:', userMessage.id);

		// Create the streaming response with agent
		return createAgentUIStreamResponse({
			agent,
			prompt: question,
			headers: {
				'X-Conversation-Id': convId,
				'X-User-Message-Id': userMessage.id,
				// Add streaming headers to prevent buffering
				'Transfer-Encoding': 'chunked',
				'Connection': 'keep-alive',
				'Cache-Control': 'no-cache, no-transform',
				'X-Accel-Buffering': 'no'
			},
			onFinish: async ({ output }) => {
				console.log('[council] Agent finished, saving responses');

				// Save all advisor responses
				for (const advisor of output.rawAdvisorResponses) {
					const persona = personas.find((p) => p.name === advisor.advisorName);
					await messageService.create(
						{
							conversationId: convId,
							role: 'advisor',
							content: advisor.response,
							personaId: persona?.id,
							parentMessageId: userMessage.id
						},
						locals.user!.id
					);
				}

				// Save synthesis as JSON
				await messageService.create(
					{
						conversationId: convId,
						role: 'synthesis',
						content: JSON.stringify({
							pointsOfAgreement: output.pointsOfAgreement,
							keyTensions: output.keyTensions,
							recommendedNextSteps: output.recommendedNextSteps
						}),
						parentMessageId: userMessage.id,
						modelId: 'claude-sonnet-4'
					},
					locals.user!.id
				);

				console.log('[council] Saved all advisor responses and synthesis');
			}
		});
	} catch (error) {
		console.error('[council] Error:', error);
		const message = error instanceof Error ? error.message : 'Unknown error';
		const stack = error instanceof Error ? error.stack : '';
		console.error('[council] Stack:', stack);
		return new Response(JSON.stringify({ error: message, stack }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
