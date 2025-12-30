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

		// Stream agent execution with real-time progress
		console.log('[council] Starting agent execution with streaming...');

		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			async start(controller) {
				try {
					// Send metadata immediately
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({ type: 'metadata', conversationId: convId, userMessageId: userMessage.id })}\n\n`
						)
					);

					// Execute agent with onStepFinish callback to capture tool results
					const result = await agent.generate({
						prompt: question,
						onStepFinish: async (step) => {
							// Check for tool results in this step
							if (step.toolResults && step.toolResults.length > 0) {
								for (const toolResult of step.toolResults) {
									if (toolResult.type === 'tool-result') {
										const advisorResponse = toolResult.output as {
											advisorId: string;
											advisorName: string;
											advisorRole: string;
											response: string;
										};

										console.log('[council] Streaming advisor response:', advisorResponse.advisorName);

										// Stream to client immediately
										controller.enqueue(
											encoder.encode(
												`data: ${JSON.stringify({ type: 'advisor-response', advisor: advisorResponse })}\n\n`
											)
										);

										// Save to database immediately
										const persona = personas.find((p) => p.name === advisorResponse.advisorName);
										await messageService.create(
											{
												conversationId: convId,
												role: 'advisor',
												content: advisorResponse.response,
												personaId: persona?.id,
												parentMessageId: userMessage.id
											},
											locals.user!.id
										);
									}
								}
							}
						}
					});

					console.log('[council] Agent finished, output:', !!result.output);

					// Save synthesis to database
					if (result.output) {
						await messageService.create(
							{
								conversationId: convId,
								role: 'synthesis',
								content: JSON.stringify({
									pointsOfAgreement: result.output.pointsOfAgreement,
									keyTensions: result.output.keyTensions,
									recommendedNextSteps: result.output.recommendedNextSteps
								}),
								parentMessageId: userMessage.id,
								modelId: 'claude-sonnet-4'
							},
							locals.user!.id
						);

						// Stream synthesis to client
						controller.enqueue(
							encoder.encode(
								`data: ${JSON.stringify({ type: 'synthesis', synthesis: result.output })}\n\n`
							)
						);
					}

					// Send completion
					controller.enqueue(encoder.encode('data: [DONE]\n\n'));
					controller.close();
				} catch (error) {
					console.error('[council] Stream error:', error);
					const message = error instanceof Error ? error.message : 'Unknown error';
					controller.enqueue(
						encoder.encode(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`)
					);
					controller.close();
				}
			}
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache, no-transform',
				'Connection': 'keep-alive',
				'X-Accel-Buffering': 'no',
				'X-Conversation-Id': convId,
				'X-User-Message-Id': userMessage.id
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
