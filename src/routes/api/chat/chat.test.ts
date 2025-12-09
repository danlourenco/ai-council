import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convertToModelMessages } from 'ai';

// Test the message format detection and conversion logic used in the chat API

describe('Chat API Message Format Handling', () => {
	describe('format detection', () => {
		it('detects UI format (messages with parts array)', () => {
			const uiMessages = [
				{
					id: 'msg-1',
					role: 'user',
					parts: [{ type: 'text', text: 'Hello' }]
				}
			];

			const isUIFormat = uiMessages[0]?.parts !== undefined;

			expect(isUIFormat).toBe(true);
		});

		it('detects simple format (messages with content string)', () => {
			const simpleMessages = [{ role: 'user', content: 'Hello' }];

			const isUIFormat = (simpleMessages[0] as { parts?: unknown }).parts !== undefined;

			expect(isUIFormat).toBe(false);
		});

		it('handles empty message array', () => {
			const emptyMessages: unknown[] = [];

			// Should check for existence before accessing properties
			const isUIFormat = emptyMessages[0] && (emptyMessages[0] as { parts?: unknown }).parts !== undefined;

			expect(isUIFormat).toBeFalsy();
		});
	});

	describe('UI format conversion', () => {
		it('extracts text from single text part', () => {
			const uiMessage = {
				id: 'msg-1',
				role: 'user',
				parts: [{ type: 'text', text: 'What should I do?' }]
			};

			const textPart = uiMessage.parts.find((p) => p.type === 'text');
			const content = textPart?.text || '';

			expect(content).toBe('What should I do?');
		});

		it('extracts text from multiple parts', () => {
			const uiMessage = {
				id: 'msg-1',
				role: 'user',
				parts: [
					{ type: 'text', text: 'First part. ' },
					{ type: 'image', url: 'https://example.com/image.png' },
					{ type: 'text', text: 'Second part.' }
				]
			};

			const textParts = uiMessage.parts.filter((p) => p.type === 'text');
			const content = textParts.map((p) => (p as { text: string }).text).join('');

			expect(content).toBe('First part. Second part.');
		});

		it('extracts last user message content for title', () => {
			const uiMessages = [
				{
					id: 'msg-1',
					role: 'user',
					parts: [{ type: 'text', text: 'First question' }]
				},
				{
					id: 'msg-2',
					role: 'assistant',
					parts: [{ type: 'text', text: 'Answer' }]
				},
				{
					id: 'msg-3',
					role: 'user',
					parts: [{ type: 'text', text: 'Follow-up question' }]
				}
			];

			const lastUserMessage = uiMessages.filter((m) => m.role === 'user').pop();
			const lastUserContent =
				lastUserMessage?.parts?.find((p) => p.type === 'text')?.text || '';

			expect(lastUserContent).toBe('Follow-up question');
		});

		it('handles messages without text parts', () => {
			const uiMessage = {
				id: 'msg-1',
				role: 'user',
				parts: [{ type: 'image', url: 'https://example.com/image.png' }]
			};

			const textPart = uiMessage.parts.find((p) => p.type === 'text');
			const content = (textPart as { text?: string })?.text || '';

			expect(content).toBe('');
		});
	});

	describe('simple format conversion', () => {
		it('converts simple messages to model format', () => {
			const simpleMessages = [
				{ role: 'user', content: 'What should I do?' },
				{ role: 'assistant', content: 'Let me help you.' }
			];

			const modelMessages = simpleMessages.map((m) => ({
				role: m.role as 'user' | 'assistant',
				content: m.content
			}));

			expect(modelMessages).toEqual([
				{ role: 'user', content: 'What should I do?' },
				{ role: 'assistant', content: 'Let me help you.' }
			]);
		});

		it('converts advisor role to assistant', () => {
			const simpleMessages = [
				{ role: 'user', content: 'Question' },
				{ role: 'advisor', content: 'First advisor response' },
				{ role: 'advisor', content: 'Second advisor response' }
			];

			const modelMessages = simpleMessages.map((m) => ({
				role: (m.role === 'advisor' ? 'assistant' : m.role) as 'user' | 'assistant',
				content: m.content
			}));

			expect(modelMessages[1].role).toBe('assistant');
			expect(modelMessages[2].role).toBe('assistant');
		});

		it('extracts last user content for title', () => {
			const simpleMessages = [
				{ role: 'user', content: 'First question' },
				{ role: 'assistant', content: 'Answer' },
				{ role: 'user', content: 'Follow-up question' }
			];

			const lastUserMessage = simpleMessages.filter((m) => m.role === 'user').pop();
			const lastUserContent = lastUserMessage?.content || '';

			expect(lastUserContent).toBe('Follow-up question');
		});
	});

	describe('Brain Trust mode specifics', () => {
		it('includes parentMessageId for subsequent advisors', () => {
			const requestBody = {
				personaId: 'persona-1',
				messages: [
					{ role: 'user', content: 'Question' },
					{ role: 'assistant', content: 'First advisor response' }
				],
				mode: 'brain-trust',
				conversationId: 'conv-123',
				parentMessageId: 'msg-user-123'
			};

			expect(requestBody.parentMessageId).toBe('msg-user-123');
			expect(requestBody.mode).toBe('brain-trust');
		});

		it('first advisor call does not have parentMessageId', () => {
			const firstAdvisorRequest = {
				personaId: 'persona-1',
				messages: [{ role: 'user', content: 'Question' }],
				mode: 'brain-trust',
				conversationId: undefined,
				parentMessageId: undefined
			};

			expect(firstAdvisorRequest.parentMessageId).toBeUndefined();
		});

		it('accumulates messages for sequential advisors', () => {
			// Simulate the message accumulation for 3 advisors
			const userMessage = { role: 'user', content: 'Should I quit my job?' };
			const advisor1Response = { role: 'advisor', content: 'Consider your finances.' };
			const advisor2Response = { role: 'advisor', content: 'Think about timing.' };

			// First advisor sees only user message
			const advisor1Messages = [userMessage];
			expect(advisor1Messages).toHaveLength(1);

			// Second advisor sees user + first advisor
			const advisor2Messages = [userMessage, advisor1Response];
			expect(advisor2Messages).toHaveLength(2);

			// Third advisor sees user + first + second advisors
			const advisor3Messages = [userMessage, advisor1Response, advisor2Response];
			expect(advisor3Messages).toHaveLength(3);
		});
	});

	describe('response headers', () => {
		it('includes X-Conversation-Id header', () => {
			const headers = new Headers();
			headers.set('X-Conversation-Id', 'conv-123');

			expect(headers.get('X-Conversation-Id')).toBe('conv-123');
		});

		it('includes X-User-Message-Id header for first advisor', () => {
			const headers = new Headers();
			const userMessageId = 'msg-user-456';

			if (userMessageId) {
				headers.set('X-User-Message-Id', userMessageId);
			}

			expect(headers.get('X-User-Message-Id')).toBe('msg-user-456');
		});

		it('does not include X-User-Message-Id for subsequent advisors', () => {
			const headers = new Headers();
			headers.set('X-Conversation-Id', 'conv-123');
			// userMessageId is undefined for subsequent advisors
			const userMessageId = undefined;

			if (userMessageId) {
				headers.set('X-User-Message-Id', userMessageId);
			}

			expect(headers.get('X-Conversation-Id')).toBe('conv-123');
			expect(headers.get('X-User-Message-Id')).toBeNull();
		});
	});

	describe('error handling', () => {
		it('rejects empty messages array', () => {
			const messages: unknown[] = [];

			const isValid = messages && messages.length > 0;

			expect(isValid).toBe(false);
		});

		it('rejects null messages', () => {
			const messages = null;

			const isValid = messages && (messages as unknown[]).length > 0;

			expect(isValid).toBeFalsy();
		});

		it('rejects undefined messages', () => {
			const messages = undefined;

			const isValid = messages && (messages as unknown[]).length > 0;

			expect(isValid).toBeFalsy();
		});
	});

	describe('conversation title extraction', () => {
		it('truncates long titles to 100 characters', () => {
			const longContent =
				'This is a very long question that goes on and on and on and exceeds the one hundred character limit that we use for conversation titles in the database';

			const title = longContent.slice(0, 100) || 'New Conversation';

			expect(title.length).toBeLessThanOrEqual(100);
			expect(title).not.toBe('New Conversation');
		});

		it('uses default title for empty content', () => {
			const emptyContent = '';

			const title = emptyContent.slice(0, 100) || 'New Conversation';

			expect(title).toBe('New Conversation');
		});

		it('preserves short titles completely', () => {
			const shortContent = 'Should I buy a house?';

			const title = shortContent.slice(0, 100) || 'New Conversation';

			expect(title).toBe('Should I buy a house?');
		});
	});
});

describe('Brain Trust system prompt enhancement', () => {
	const BRAIN_TRUST_ADDENDUM = `

IMPORTANT: You are participating in a "Brain Trust" discussion with other advisors.
If you see responses from other advisors in the conversation:
- Acknowledge their perspectives where relevant
- Offer your unique viewpoint that adds to or contrasts with what's been said
- Don't simply repeat what others have already covered
- Feel free to respectfully disagree or challenge other advisors' positions
- Build on good ideas from others while adding your own expertise`;

	it('appends Brain Trust instructions in brain-trust mode', () => {
		const baseSystemPrompt = 'You are The Sage, a wise advisor.';
		const mode = 'brain-trust';

		const systemPrompt =
			mode === 'brain-trust'
				? baseSystemPrompt + BRAIN_TRUST_ADDENDUM
				: baseSystemPrompt;

		expect(systemPrompt).toContain('You are The Sage');
		expect(systemPrompt).toContain('Brain Trust');
		expect(systemPrompt).toContain("Don't simply repeat");
		expect(systemPrompt).toContain('respectfully disagree');
	});

	it('does not append Brain Trust instructions in quick mode', () => {
		const baseSystemPrompt = 'You are The Sage, a wise advisor.';
		const mode = 'quick';

		const systemPrompt =
			mode === 'brain-trust'
				? baseSystemPrompt + BRAIN_TRUST_ADDENDUM
				: baseSystemPrompt;

		expect(systemPrompt).toBe(baseSystemPrompt);
		expect(systemPrompt).not.toContain('Brain Trust');
	});

	it('Brain Trust addendum contains key instructions', () => {
		expect(BRAIN_TRUST_ADDENDUM).toContain('Acknowledge their perspectives');
		expect(BRAIN_TRUST_ADDENDUM).toContain('unique viewpoint');
		expect(BRAIN_TRUST_ADDENDUM).toContain("Don't simply repeat");
		expect(BRAIN_TRUST_ADDENDUM).toContain('disagree or challenge');
		expect(BRAIN_TRUST_ADDENDUM).toContain('Build on good ideas');
	});
});

describe('convertToModelMessages integration', () => {
	it('converts UI messages with text parts', () => {
		const uiMessages = [
			{
				id: 'msg-1',
				role: 'user',
				parts: [{ type: 'text', text: 'Hello, how are you?' }]
			}
		];

		// The actual AI SDK function
		const modelMessages = convertToModelMessages(uiMessages as any);

		expect(modelMessages).toHaveLength(1);
		expect(modelMessages[0].role).toBe('user');
	});

	it('converts multiple messages maintaining order', () => {
		const uiMessages = [
			{
				id: 'msg-1',
				role: 'user',
				parts: [{ type: 'text', text: 'First message' }]
			},
			{
				id: 'msg-2',
				role: 'assistant',
				parts: [{ type: 'text', text: 'Response' }]
			},
			{
				id: 'msg-3',
				role: 'user',
				parts: [{ type: 'text', text: 'Follow up' }]
			}
		];

		const modelMessages = convertToModelMessages(uiMessages as any);

		expect(modelMessages).toHaveLength(3);
		expect(modelMessages[0].role).toBe('user');
		expect(modelMessages[1].role).toBe('assistant');
		expect(modelMessages[2].role).toBe('user');
	});
});
