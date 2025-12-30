import { ToolLoopAgent, Output } from 'ai';
import { z } from 'zod';
import { createAdvisorTool } from './advisor-tools';
import { getModel, SYNTHESIS_MODEL_ID } from './providers';
import type { Persona } from '$lib/server/db/schema';

const synthesisSchema = z.object({
	pointsOfAgreement: z.array(z.string()).describe('Where 2+ advisors align in their perspectives'),
	keyTensions: z
		.array(
			z.object({
				topic: z.string().describe('The subject matter where advisors disagree'),
				sagePosition: z.string().optional().describe("The Sage's position on this topic"),
				skepticPosition: z.string().optional().describe("The Skeptic's position on this topic"),
				strategistPosition: z.string().optional().describe("The Strategist's position on this topic")
			})
		)
		.describe('Where advisors disagree or see different risks'),
	recommendedNextSteps: z
		.array(z.string())
		.describe('Concrete actions that account for all perspectives'),
	rawAdvisorResponses: z
		.array(
			z.object({
				advisorName: z.string(),
				response: z.string()
			})
		)
		.describe('The full response from each advisor')
});

export type CouncilSynthesis = z.infer<typeof synthesisSchema>;

/**
 * Create a Council Agent that orchestrates three advisors in sequence
 * and synthesizes their responses into structured output.
 *
 * The agent ensures each advisor receives all prior responses as context.
 */
export function createCouncilAgent(personas: Persona[], env: Record<string, string>) {
	const sage = personas.find((p) => p.name === 'The Sage');
	const skeptic = personas.find((p) => p.name === 'The Skeptic');
	const strategist = personas.find((p) => p.name === 'The Strategist');

	if (!sage || !skeptic || !strategist) {
		throw new Error('Missing required personas: The Sage, The Skeptic, or The Strategist');
	}

	return new ToolLoopAgent({
		model: getModel(SYNTHESIS_MODEL_ID, env),
		instructions: `You are the Council Orchestrator. For each user question, you MUST:

1. Call consultSage with just the user question
2. Call consultSkeptic with the question AND The Sage's response
3. Call consultStrategist with the question AND both prior responses
4. After all three advisors respond, synthesize into the structured output

CRITICAL: Always call advisors in this exact order. Each subsequent advisor must receive all prior responses. Never skip an advisor. Never call them in parallel.

When synthesizing:
- pointsOfAgreement: Where 2+ advisors align
- keyTensions: Where advisors disagree or see different risks
- recommendedNextSteps: Concrete actions that account for all perspectives
- rawAdvisorResponses: Include the full response from each advisor

Be thorough and comprehensive in your synthesis. Don't artificially resolve tensions - acknowledge where advisors genuinely disagree.`,
		tools: {
			consultSage: createAdvisorTool(sage, env),
			consultSkeptic: createAdvisorTool(skeptic, env),
			consultStrategist: createAdvisorTool(strategist, env)
		},
		output: Output.object({ schema: synthesisSchema })
	});
}
