import { streamText } from 'ai';
import { getModel, SYNTHESIS_MODEL_ID } from '$lib/server/ai/providers';
import { PersonaService } from '$lib/server/services/personas';
import { MessageService } from '$lib/server/services/messages';
import type { RequestHandler } from './$types';

const SYNTHESIS_SYSTEM_PROMPT = `You are the Council Synthesizer, responsible for distilling insights from multiple advisors.

Given responses from different advisors, create a synthesis with these sections:

## Points of Agreement
Where advisors align in perspectives or recommendations.

## Key Tensions
Where advisors disagree. Explain tensions without artificially resolving them.

## Recommended Next Steps
Concrete actions accounting for different perspectives.

Guidelines:
- Be concise but comprehensive
- Don't favor any single advisor
- Acknowledge uncertainty
- Focus on actionable insights`;

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	console.log('[synthesis] POST request received');

	try {
		if (!locals.user) {
			console.log('[synthesis] Unauthorized - no user');
			return new Response('Unauthorized', { status: 401 });
		}

		const body = (await request.json()) as {
			conversationId: string;
			userQuestionId: string;
		};

		const { conversationId, userQuestionId } = body;

		if (!conversationId || !userQuestionId) {
			return new Response('Missing required fields: conversationId and userQuestionId', {
				status: 400
			});
		}

		console.log('[synthesis] Request:', { conversationId, userQuestionId });

		const personaService = new PersonaService(locals.db);
		const messageService = new MessageService(locals.db);

		// Fetch the user's question
		const userQuestion = await messageService.get(userQuestionId);
		if (!userQuestion) {
			console.log('[synthesis] User question not found:', userQuestionId);
			return new Response('User question not found', { status: 404 });
		}

		// Fetch all advisor responses to this question
		const advisorMessages = await messageService.getByParentId(userQuestionId);
		console.log('[synthesis] Found advisor messages:', advisorMessages.length);

		if (advisorMessages.length === 0) {
			return new Response('No advisor messages found for this question', { status: 404 });
		}

		// Build the synthesis prompt with all advisor responses
		const advisorResponses = await Promise.all(
			advisorMessages.map(async (msg) => {
				const persona = msg.personaId ? await personaService.get(msg.personaId) : null;
				return {
					advisorName: persona?.name ?? 'Unknown Advisor',
					content: msg.content
				};
			})
		);

		const synthesisPrompt = `Here is the user's question:

"${userQuestion.content}"

Here are the responses from the advisors:

${advisorResponses.map((r) => `### ${r.advisorName}\n${r.content}`).join('\n\n')}

Please synthesize these perspectives into a cohesive summary following your guidelines.`;

		// Get environment variables from platform
		const env = {
			ANTHROPIC_API_KEY: platform?.env?.ANTHROPIC_API_KEY ?? '',
			OPENAI_API_KEY: platform?.env?.OPENAI_API_KEY ?? '',
			GOOGLE_AI_API_KEY: platform?.env?.GOOGLE_AI_API_KEY ?? ''
		};

		console.log('[synthesis] Starting synthesis with model:', SYNTHESIS_MODEL_ID);

		const model = getModel(SYNTHESIS_MODEL_ID, env);

		const result = streamText({
			model,
			system: SYNTHESIS_SYSTEM_PROMPT,
			prompt: synthesisPrompt,
			onFinish: async ({ text, totalUsage }) => {
				console.log('[synthesis] Stream finished, saving message');

				// Save synthesis message
				await messageService.create(
					{
						conversationId,
						role: 'synthesis',
						content: text,
						modelId: SYNTHESIS_MODEL_ID,
						parentMessageId: userQuestionId,
						metadata: {
							inputTokens: totalUsage?.inputTokens,
							outputTokens: totalUsage?.outputTokens,
							advisorCount: advisorMessages.length
						}
					},
					locals.user!.id
				);
			}
		});

		// Return streaming response
		const response = result.toUIMessageStreamResponse();

		return new Response(response.body, {
			status: response.status,
			headers: response.headers
		});
	} catch (error) {
		console.error('[synthesis] Error:', error);
		const message = error instanceof Error ? error.message : 'Unknown error';
		return new Response(JSON.stringify({ error: message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
