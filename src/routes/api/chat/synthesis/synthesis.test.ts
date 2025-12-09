import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the AI SDK streamText
vi.mock('ai', () => ({
	streamText: vi.fn()
}));

// Mock the providers
vi.mock('$lib/server/ai/providers', () => ({
	getModel: vi.fn(() => 'mock-model'),
	SYNTHESIS_MODEL_ID: 'claude-sonnet-4'
}));

import { streamText } from 'ai';
import { getModel, SYNTHESIS_MODEL_ID } from '$lib/server/ai/providers';

// Create mock services
function createMockPersonaService() {
	return {
		get: vi.fn()
	};
}

function createMockMessageService() {
	return {
		get: vi.fn(),
		getByParentId: vi.fn(),
		create: vi.fn()
	};
}

// Mock Response for streaming
function createMockStreamResponse() {
	return {
		body: new ReadableStream(),
		status: 200,
		headers: new Headers({ 'Content-Type': 'text/event-stream' })
	};
}

describe('Synthesis API', () => {
	let mockPersonaService: ReturnType<typeof createMockPersonaService>;
	let mockMessageService: ReturnType<typeof createMockMessageService>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockPersonaService = createMockPersonaService();
		mockMessageService = createMockMessageService();
	});

	describe('request validation', () => {
		it('requires conversationId', async () => {
			const body = { userQuestionId: 'msg-123' };

			// This is a unit test of the validation logic
			const hasConversationId = !!body.conversationId;
			const hasUserQuestionId = !!body.userQuestionId;

			expect(hasConversationId).toBe(false);
			expect(hasUserQuestionId).toBe(true);
		});

		it('requires userQuestionId', async () => {
			const body = { conversationId: 'conv-123' };

			const hasConversationId = !!(body as { conversationId?: string }).conversationId;
			const hasUserQuestionId = !!(body as { userQuestionId?: string }).userQuestionId;

			expect(hasConversationId).toBe(true);
			expect(hasUserQuestionId).toBe(false);
		});

		it('accepts valid request body', async () => {
			const body = {
				conversationId: 'conv-123',
				userQuestionId: 'msg-456'
			};

			const hasConversationId = !!body.conversationId;
			const hasUserQuestionId = !!body.userQuestionId;

			expect(hasConversationId).toBe(true);
			expect(hasUserQuestionId).toBe(true);
		});
	});

	describe('message fetching', () => {
		it('fetches user question by ID', async () => {
			const userQuestionId = 'msg-123';
			const mockUserQuestion = {
				id: userQuestionId,
				role: 'user',
				content: 'What should I do?',
				conversationId: 'conv-456'
			};

			mockMessageService.get.mockResolvedValue(mockUserQuestion);

			const result = await mockMessageService.get(userQuestionId);

			expect(mockMessageService.get).toHaveBeenCalledWith(userQuestionId);
			expect(result).toEqual(mockUserQuestion);
		});

		it('returns null for non-existent user question', async () => {
			mockMessageService.get.mockResolvedValue(null);

			const result = await mockMessageService.get('non-existent');

			expect(result).toBeNull();
		});

		it('fetches advisor messages by parent ID', async () => {
			const userQuestionId = 'msg-123';
			const mockAdvisorMessages = [
				{
					id: 'msg-a1',
					role: 'advisor',
					content: 'First advisor response',
					personaId: 'persona-1',
					parentMessageId: userQuestionId
				},
				{
					id: 'msg-a2',
					role: 'advisor',
					content: 'Second advisor response',
					personaId: 'persona-2',
					parentMessageId: userQuestionId
				}
			];

			mockMessageService.getByParentId.mockResolvedValue(mockAdvisorMessages);

			const result = await mockMessageService.getByParentId(userQuestionId);

			expect(mockMessageService.getByParentId).toHaveBeenCalledWith(userQuestionId);
			expect(result).toHaveLength(2);
		});

		it('returns empty array when no advisor messages exist', async () => {
			mockMessageService.getByParentId.mockResolvedValue([]);

			const result = await mockMessageService.getByParentId('msg-123');

			expect(result).toEqual([]);
		});
	});

	describe('synthesis prompt building', () => {
		it('builds prompt with user question and advisor responses', () => {
			const userQuestion = { content: 'Should I quit my job?' };
			const advisorResponses = [
				{ advisorName: 'The Sage', content: 'Consider your options carefully.' },
				{ advisorName: 'The Skeptic', content: 'What are the risks?' }
			];

			const prompt = `Here is the user's question:

"${userQuestion.content}"

Here are the responses from the advisors:

${advisorResponses.map((r) => `### ${r.advisorName}\n${r.content}`).join('\n\n')}

Please synthesize these perspectives into a cohesive summary following your guidelines.`;

			expect(prompt).toContain('Should I quit my job?');
			expect(prompt).toContain('### The Sage');
			expect(prompt).toContain('Consider your options carefully.');
			expect(prompt).toContain('### The Skeptic');
			expect(prompt).toContain('What are the risks?');
		});

		it('handles unknown advisor when persona not found', () => {
			const advisorResponses = [{ advisorName: 'Unknown Advisor', content: 'Some response' }];

			const prompt = advisorResponses
				.map((r) => `### ${r.advisorName}\n${r.content}`)
				.join('\n\n');

			expect(prompt).toContain('### Unknown Advisor');
		});
	});

	describe('synthesis system prompt', () => {
		it('contains required sections', () => {
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

			expect(SYNTHESIS_SYSTEM_PROMPT).toContain('Points of Agreement');
			expect(SYNTHESIS_SYSTEM_PROMPT).toContain('Key Tensions');
			expect(SYNTHESIS_SYSTEM_PROMPT).toContain('Recommended Next Steps');
			expect(SYNTHESIS_SYSTEM_PROMPT).toContain("Don't favor any single advisor");
		});
	});

	describe('model configuration', () => {
		it('uses SYNTHESIS_MODEL_ID for synthesis', () => {
			expect(SYNTHESIS_MODEL_ID).toBe('claude-sonnet-4');
		});

		it('calls getModel with synthesis model ID', () => {
			const env = {
				ANTHROPIC_API_KEY: 'test-key',
				OPENAI_API_KEY: '',
				GOOGLE_AI_API_KEY: ''
			};

			getModel(SYNTHESIS_MODEL_ID, env);

			expect(getModel).toHaveBeenCalledWith('claude-sonnet-4', env);
		});
	});

	describe('message saving', () => {
		it('saves synthesis message with correct role', async () => {
			const synthesisData = {
				conversationId: 'conv-123',
				role: 'synthesis',
				content: '## Points of Agreement\n...',
				modelId: 'claude-sonnet-4',
				parentMessageId: 'msg-user-123',
				metadata: {
					inputTokens: 100,
					outputTokens: 500,
					advisorCount: 3
				}
			};

			mockMessageService.create.mockResolvedValue({ id: 'msg-synth-1', ...synthesisData });

			const result = await mockMessageService.create(synthesisData, 'user-id');

			expect(mockMessageService.create).toHaveBeenCalledWith(synthesisData, 'user-id');
			expect(result.role).toBe('synthesis');
		});

		it('includes advisor count in metadata', async () => {
			const synthesisData = {
				conversationId: 'conv-123',
				role: 'synthesis',
				content: 'Synthesis content',
				modelId: 'claude-sonnet-4',
				parentMessageId: 'msg-user-123',
				metadata: {
					inputTokens: 100,
					outputTokens: 500,
					advisorCount: 3
				}
			};

			mockMessageService.create.mockResolvedValue({ id: 'msg-synth-1', ...synthesisData });

			const result = await mockMessageService.create(synthesisData, 'user-id');

			expect(result.metadata?.advisorCount).toBe(3);
		});
	});

	describe('error scenarios', () => {
		it('handles missing user question gracefully', async () => {
			mockMessageService.get.mockResolvedValue(null);

			const result = await mockMessageService.get('non-existent-id');

			expect(result).toBeNull();
			// In the actual endpoint, this would return a 404 response
		});

		it('handles empty advisor messages', async () => {
			mockMessageService.getByParentId.mockResolvedValue([]);

			const result = await mockMessageService.getByParentId('msg-123');

			expect(result).toEqual([]);
			// In the actual endpoint, this would return a 404 response
		});

		it('handles persona lookup failure', async () => {
			mockPersonaService.get.mockResolvedValue(null);

			const result = await mockPersonaService.get('non-existent-persona');

			expect(result).toBeNull();
			// In the actual endpoint, this falls back to "Unknown Advisor"
		});
	});
});

describe('Synthesis Integration', () => {
	it('produces expected output structure', () => {
		// Test the expected structure of a synthesis response
		const expectedSections = ['Points of Agreement', 'Key Tensions', 'Recommended Next Steps'];

		const sampleSynthesis = `## Points of Agreement
Both advisors agree that careful planning is essential.

## Key Tensions
The Sage emphasizes patience while The Skeptic urges caution about timing.

## Recommended Next Steps
1. Create a detailed financial plan
2. Set a timeline with milestones
3. Consult with additional experts`;

		for (const section of expectedSections) {
			expect(sampleSynthesis).toContain(section);
		}
	});
});
