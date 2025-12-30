import { tool, generateText } from 'ai';
import { z } from 'zod';
import { getModel } from './providers';
import type { Persona } from '$lib/server/db/schema';

const priorResponseSchema = z.object({
	advisorName: z.string(),
	advisorRole: z.string(),
	response: z.string()
});

/**
 * Create a tool for consulting an advisor.
 *
 * The tool accepts a user question and optional prior responses from other advisors.
 * It formats the context and calls the appropriate model with the advisor's system prompt.
 */
export function createAdvisorTool(persona: Persona, env: Record<string, string>) {
	return tool({
		description: `Consult ${persona.name} (${persona.role})`,
		inputSchema: z.object({
			question: z.string().describe('The user question to address'),
			priorResponses: z
				.array(priorResponseSchema)
				.optional()
				.describe('Responses from advisors consulted before this one')
		}),
		execute: async ({ question, priorResponses }) => {
			const model = getModel(persona.defaultModelId, env);

			// Build context with prior responses
			let contextPrompt = `User Question: ${question}`;
			if (priorResponses?.length) {
				contextPrompt += '\n\nPrior Advisor Responses:\n';
				for (const prior of priorResponses) {
					contextPrompt += `\n### ${prior.advisorName} (${prior.advisorRole})\n${prior.response}\n`;
				}
			}

			const result = await generateText({
				model,
				system: persona.systemPrompt,
				prompt: contextPrompt
			});

			return {
				advisorId: persona.id,
				advisorName: persona.name,
				advisorRole: persona.role,
				response: result.text
			};
		}
	});
}
