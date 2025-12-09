import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrainTrust } from './brain-trust.svelte';
import type { Advisor, Message, BrainTrustConfig } from './types';

/**
 * Helper to create a mock streaming response
 */
function createMockStreamResponse(chunks: string[]): Response {
	const encoder = new TextEncoder();
	let chunkIndex = 0;

	const stream = new ReadableStream({
		pull(controller) {
			if (chunkIndex < chunks.length) {
				controller.enqueue(encoder.encode(chunks[chunkIndex]));
				chunkIndex++;
			} else {
				controller.close();
			}
		}
	});

	return new Response(stream, { status: 200 });
}

/**
 * Helper to create SSE formatted data
 */
function sseData(obj: object): string {
	return `data: ${JSON.stringify(obj)}\n`;
}

/**
 * Helper to create a simple text stream response
 */
function createTextStreamResponse(text: string): Response {
	const chunks = text.split('').map((char) => sseData({ type: 'text-delta', delta: char }));
	return createMockStreamResponse(chunks);
}

/**
 * Mock async generator for parseStream
 */
async function* mockParseStream(response: Response): AsyncGenerator<string> {
	if (!response.body) return;

	const reader = response.body.getReader();
	const decoder = new TextDecoder();

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		const text = decoder.decode(value, { stream: true });
		const lines = text.split('\n');

		for (const line of lines) {
			if (!line.trim() || !line.startsWith('data: ')) continue;
			const jsonStr = line.slice(6);
			try {
				const part = JSON.parse(jsonStr);
				if (part.type === 'text-delta' && part.delta) {
					yield part.delta;
				}
			} catch {
				// Skip malformed JSON
			}
		}
	}
}

describe('BrainTrust', () => {
	let mockConfig: BrainTrustConfig;
	let mockFetchAdvisor: ReturnType<typeof vi.fn>;
	let mockFetchSynthesis: ReturnType<typeof vi.fn>;
	let mockOnAdvisorComplete: ReturnType<typeof vi.fn>;
	let mockOnSynthesisComplete: ReturnType<typeof vi.fn>;
	let mockOnError: ReturnType<typeof vi.fn>;

	const testAdvisors: Advisor[] = [
		{ id: 'advisor-1', name: 'The Sage' },
		{ id: 'advisor-2', name: 'The Skeptic' },
		{ id: 'advisor-3', name: 'The Strategist' }
	];

	beforeEach(() => {
		vi.clearAllMocks();

		mockFetchAdvisor = vi.fn();
		mockFetchSynthesis = vi.fn();
		mockOnAdvisorComplete = vi.fn();
		mockOnSynthesisComplete = vi.fn();
		mockOnError = vi.fn();

		mockConfig = {
			fetchAdvisor: mockFetchAdvisor,
			fetchSynthesis: mockFetchSynthesis,
			parseStream: mockParseStream,
			onAdvisorComplete: mockOnAdvisorComplete,
			onSynthesisComplete: mockOnSynthesisComplete,
			onError: mockOnError
		};
	});

	describe('constructor', () => {
		it('initializes with default state', () => {
			const bt = new BrainTrust(mockConfig);

			expect(bt.messages).toEqual([]);
			expect(bt.status).toBe('idle');
			expect(bt.currentAdvisorIndex).toBe(0);
			expect(bt.streamingContent).toBe('');
			expect(bt.streamingAdvisorId).toBeNull();
			expect(bt.synthesisContent).toBe('');
			expect(bt.error).toBeNull();
		});
	});

	describe('start', () => {
		it('throws error when no advisors provided', async () => {
			const bt = new BrainTrust(mockConfig);

			await expect(bt.start('Question?', [])).rejects.toThrow(
				'At least one advisor is required'
			);
		});

		it('adds user message and sets status to querying', async () => {
			mockFetchAdvisor.mockResolvedValue(createTextStreamResponse('Response'));
			mockFetchSynthesis.mockResolvedValue(createTextStreamResponse('Synthesis'));

			const bt = new BrainTrust(mockConfig);
			const startPromise = bt.start('What should I do?', [testAdvisors[0]]);

			// Check initial state after starting
			expect(bt.status).toBe('querying');
			expect(bt.messages.length).toBe(1);
			expect(bt.messages[0].role).toBe('user');
			expect(bt.messages[0].content).toBe('What should I do?');

			await startPromise;
		});

		it('queries advisors sequentially', async () => {
			const responses = [
				createTextStreamResponse('First response'),
				createTextStreamResponse('Second response')
			];
			let callCount = 0;
			mockFetchAdvisor.mockImplementation(() => {
				return Promise.resolve(responses[callCount++]);
			});
			mockFetchSynthesis.mockResolvedValue(createTextStreamResponse('Synthesis'));

			const bt = new BrainTrust(mockConfig);
			await bt.start('Question?', [testAdvisors[0], testAdvisors[1]]);

			expect(mockFetchAdvisor).toHaveBeenCalledTimes(2);

			// First call should only have user message
			const firstCall = mockFetchAdvisor.mock.calls[0];
			expect(firstCall[0]).toEqual(testAdvisors[0]);
			expect(firstCall[1]).toHaveLength(1);
			expect(firstCall[1][0].role).toBe('user');

			// Second call should have user message + first advisor response
			const secondCall = mockFetchAdvisor.mock.calls[1];
			expect(secondCall[0]).toEqual(testAdvisors[1]);
			expect(secondCall[1]).toHaveLength(2);
			expect(secondCall[1][0].role).toBe('user');
			expect(secondCall[1][1].role).toBe('advisor');
		});

		it('calls synthesis after all advisors complete', async () => {
			mockFetchAdvisor.mockResolvedValue(createTextStreamResponse('Response'));
			mockFetchSynthesis.mockResolvedValue(createTextStreamResponse('Synthesis'));

			const bt = new BrainTrust(mockConfig);
			await bt.start('Question?', [testAdvisors[0]]);

			expect(mockFetchSynthesis).toHaveBeenCalledTimes(1);
			expect(bt.synthesisContent).toBe('Synthesis');
		});

		it('sets status to complete after synthesis', async () => {
			mockFetchAdvisor.mockResolvedValue(createTextStreamResponse('Response'));
			mockFetchSynthesis.mockResolvedValue(createTextStreamResponse('Synthesis'));

			const bt = new BrainTrust(mockConfig);
			await bt.start('Question?', [testAdvisors[0]]);

			expect(bt.status).toBe('complete');
		});

		it('calls onAdvisorComplete callback for each advisor', async () => {
			// Each call needs a fresh response since streams can only be read once
			mockFetchAdvisor
				.mockResolvedValueOnce(createTextStreamResponse('Response 1'))
				.mockResolvedValueOnce(createTextStreamResponse('Response 2'));
			mockFetchSynthesis.mockResolvedValue(createTextStreamResponse('Synthesis'));

			const bt = new BrainTrust(mockConfig);
			await bt.start('Question?', [testAdvisors[0], testAdvisors[1]]);

			expect(mockOnAdvisorComplete).toHaveBeenCalledTimes(2);
			expect(mockOnAdvisorComplete.mock.calls[0][0]).toEqual(testAdvisors[0]);
			expect(mockOnAdvisorComplete.mock.calls[1][0]).toEqual(testAdvisors[1]);
		});

		it('calls onSynthesisComplete callback', async () => {
			mockFetchAdvisor.mockResolvedValue(createTextStreamResponse('Response'));
			mockFetchSynthesis.mockResolvedValue(createTextStreamResponse('Synthesis'));

			const bt = new BrainTrust(mockConfig);
			await bt.start('Question?', [testAdvisors[0]]);

			expect(mockOnSynthesisComplete).toHaveBeenCalledTimes(1);
			expect(mockOnSynthesisComplete).toHaveBeenCalledWith('Synthesis');
		});

		it('resets state before starting new session', async () => {
			// Each call needs fresh responses
			mockFetchAdvisor
				.mockResolvedValueOnce(createTextStreamResponse('Response 1'))
				.mockResolvedValueOnce(createTextStreamResponse('Response 2'));
			mockFetchSynthesis
				.mockResolvedValueOnce(createTextStreamResponse('Synthesis 1'))
				.mockResolvedValueOnce(createTextStreamResponse('Synthesis 2'));

			const bt = new BrainTrust(mockConfig);

			// First session
			await bt.start('First question?', [testAdvisors[0]]);
			expect(bt.messages.length).toBe(2); // user + advisor

			// Second session
			await bt.start('Second question?', [testAdvisors[0]]);
			expect(bt.messages.length).toBe(2); // Reset, so user + advisor
			expect(bt.messages[0].content).toBe('Second question?');
		});
	});

	describe('error handling', () => {
		it('sets error state when advisor fetch fails', async () => {
			mockFetchAdvisor.mockResolvedValue(
				new Response('Server error', { status: 500 })
			);

			const bt = new BrainTrust(mockConfig);

			await expect(bt.start('Question?', [testAdvisors[0]])).rejects.toThrow();

			expect(bt.status).toBe('error');
			expect(bt.error).toContain('Advisor The Sage failed');
		});

		it('calls onError callback when advisor fails', async () => {
			mockFetchAdvisor.mockResolvedValue(
				new Response('Server error', { status: 500 })
			);

			const bt = new BrainTrust(mockConfig);

			try {
				await bt.start('Question?', [testAdvisors[0]]);
			} catch {
				// Expected
			}

			expect(mockOnError).toHaveBeenCalledTimes(1);
			expect(mockOnError.mock.calls[0][1]).toBe('advisor');
			expect(mockOnError.mock.calls[0][2]).toEqual(testAdvisors[0]);
		});

		it('sets error state when synthesis fails', async () => {
			mockFetchAdvisor.mockResolvedValue(createTextStreamResponse('Response'));
			mockFetchSynthesis.mockResolvedValue(
				new Response('Synthesis error', { status: 500 })
			);

			const bt = new BrainTrust(mockConfig);

			await expect(bt.start('Question?', [testAdvisors[0]])).rejects.toThrow();

			expect(bt.status).toBe('error');
			expect(bt.error).toContain('Synthesis failed');
		});

		it('calls onError callback when synthesis fails', async () => {
			mockFetchAdvisor.mockResolvedValue(createTextStreamResponse('Response'));
			mockFetchSynthesis.mockResolvedValue(
				new Response('Synthesis error', { status: 500 })
			);

			const bt = new BrainTrust(mockConfig);

			try {
				await bt.start('Question?', [testAdvisors[0]]);
			} catch {
				// Expected
			}

			expect(mockOnError).toHaveBeenCalledTimes(1);
			expect(mockOnError.mock.calls[0][1]).toBe('synthesis');
		});

		it('stops processing on first advisor error', async () => {
			mockFetchAdvisor
				.mockResolvedValueOnce(createTextStreamResponse('First'))
				.mockResolvedValueOnce(new Response('Error', { status: 500 }));

			const bt = new BrainTrust(mockConfig);

			try {
				await bt.start('Question?', [testAdvisors[0], testAdvisors[1], testAdvisors[2]]);
			} catch {
				// Expected
			}

			// Should have stopped after second advisor failed
			expect(mockFetchAdvisor).toHaveBeenCalledTimes(2);
			expect(mockFetchSynthesis).not.toHaveBeenCalled();
		});
	});

	describe('abort', () => {
		it('sets status to idle when abort is called', () => {
			const bt = new BrainTrust(mockConfig);

			// Simulate being in querying state
			bt.status = 'querying';
			bt.streamingAdvisorId = 'advisor-1';
			bt.streamingContent = 'Some content';

			bt.abort();

			expect(bt.status).toBe('idle');
			expect(bt.streamingAdvisorId).toBeNull();
			expect(bt.streamingContent).toBe('');
		});

		it('clears streaming state on abort', () => {
			const bt = new BrainTrust(mockConfig);

			// Manually set some streaming state
			bt.streamingAdvisorId = 'advisor-1';
			bt.streamingContent = 'Some content';

			bt.abort();

			expect(bt.streamingAdvisorId).toBeNull();
			expect(bt.streamingContent).toBe('');
			expect(bt.status).toBe('idle');
		});
	});

	describe('reset', () => {
		it('clears all state', async () => {
			mockFetchAdvisor.mockResolvedValue(createTextStreamResponse('Response'));
			mockFetchSynthesis.mockResolvedValue(createTextStreamResponse('Synthesis'));

			const bt = new BrainTrust(mockConfig);
			await bt.start('Question?', [testAdvisors[0]]);

			bt.reset();

			expect(bt.messages).toEqual([]);
			expect(bt.status).toBe('idle');
			expect(bt.currentAdvisorIndex).toBe(0);
			expect(bt.streamingContent).toBe('');
			expect(bt.streamingAdvisorId).toBeNull();
			expect(bt.synthesisContent).toBe('');
			expect(bt.error).toBeNull();
		});
	});

	describe('derived state', () => {
		it('currentAdvisor returns correct advisor', async () => {
			mockFetchAdvisor.mockResolvedValue(createTextStreamResponse('Response'));
			mockFetchSynthesis.mockResolvedValue(createTextStreamResponse('Synthesis'));

			const bt = new BrainTrust(mockConfig);

			// Before start
			expect(bt.currentAdvisor).toBeNull();

			// Start tracking calls to verify index updates
			let capturedIndexes: number[] = [];
			mockFetchAdvisor.mockImplementation(async () => {
				capturedIndexes.push(bt.currentAdvisorIndex);
				return createTextStreamResponse('Response');
			});

			await bt.start('Question?', [testAdvisors[0], testAdvisors[1]]);

			expect(capturedIndexes).toEqual([0, 1]);
		});

		it('isComplete returns true after completion', async () => {
			mockFetchAdvisor.mockResolvedValue(createTextStreamResponse('Response'));
			mockFetchSynthesis.mockResolvedValue(createTextStreamResponse('Synthesis'));

			const bt = new BrainTrust(mockConfig);

			expect(bt.isComplete).toBe(false);

			await bt.start('Question?', [testAdvisors[0]]);

			expect(bt.isComplete).toBe(true);
		});

		it('isComplete returns true after error', async () => {
			mockFetchAdvisor.mockResolvedValue(new Response('Error', { status: 500 }));

			const bt = new BrainTrust(mockConfig);

			try {
				await bt.start('Question?', [testAdvisors[0]]);
			} catch {
				// Expected
			}

			expect(bt.isComplete).toBe(true);
		});

		it('isActive returns true during querying', async () => {
			let resolveAdvisor: (value: Response) => void;
			const advisorPromise = new Promise<Response>((resolve) => {
				resolveAdvisor = resolve;
			});

			mockFetchAdvisor.mockReturnValue(advisorPromise);
			mockFetchSynthesis.mockResolvedValue(createTextStreamResponse('Synthesis'));

			const bt = new BrainTrust(mockConfig);

			expect(bt.isActive).toBe(false);

			const startPromise = bt.start('Question?', [testAdvisors[0]]);

			expect(bt.isActive).toBe(true);
			expect(bt.status).toBe('querying');

			resolveAdvisor!(createTextStreamResponse('Response'));
			await startPromise;

			expect(bt.isActive).toBe(false);
		});

		it('progress returns correct values', async () => {
			mockFetchAdvisor.mockResolvedValue(createTextStreamResponse('Response'));
			mockFetchSynthesis.mockResolvedValue(createTextStreamResponse('Synthesis'));

			const bt = new BrainTrust(mockConfig);

			let capturedProgress: Array<{ current: number; total: number; phase: string }> = [];
			mockFetchAdvisor.mockImplementation(async () => {
				capturedProgress.push({ ...bt.progress });
				return createTextStreamResponse('Response');
			});

			await bt.start('Question?', [testAdvisors[0], testAdvisors[1], testAdvisors[2]]);

			expect(capturedProgress[0]).toEqual({ current: 0, total: 3, phase: 'querying' });
			expect(capturedProgress[1]).toEqual({ current: 1, total: 3, phase: 'querying' });
			expect(capturedProgress[2]).toEqual({ current: 2, total: 3, phase: 'querying' });
		});
	});

	describe('message accumulation', () => {
		it('accumulates messages from all advisors', async () => {
			const responses = ['First response', 'Second response', 'Third response'];
			let callIndex = 0;
			mockFetchAdvisor.mockImplementation(() => {
				return Promise.resolve(createTextStreamResponse(responses[callIndex++]));
			});
			mockFetchSynthesis.mockResolvedValue(createTextStreamResponse('Synthesis'));

			const bt = new BrainTrust(mockConfig);
			await bt.start('Question?', testAdvisors);

			// Should have user message + 3 advisor messages
			expect(bt.messages.length).toBe(4);
			expect(bt.messages[0].role).toBe('user');
			expect(bt.messages[1].role).toBe('advisor');
			expect(bt.messages[1].advisorId).toBe('advisor-1');
			expect(bt.messages[2].role).toBe('advisor');
			expect(bt.messages[2].advisorId).toBe('advisor-2');
			expect(bt.messages[3].role).toBe('advisor');
			expect(bt.messages[3].advisorId).toBe('advisor-3');
		});

		it('each advisor receives all previous messages', async () => {
			// Each call needs fresh responses
			mockFetchAdvisor
				.mockResolvedValueOnce(createTextStreamResponse('Response 1'))
				.mockResolvedValueOnce(createTextStreamResponse('Response 2'))
				.mockResolvedValueOnce(createTextStreamResponse('Response 3'));
			mockFetchSynthesis.mockResolvedValue(createTextStreamResponse('Synthesis'));

			const bt = new BrainTrust(mockConfig);
			await bt.start('Question?', testAdvisors);

			// Check message counts passed to each advisor
			expect(mockFetchAdvisor.mock.calls[0][1].length).toBe(1); // Just user
			expect(mockFetchAdvisor.mock.calls[1][1].length).toBe(2); // User + advisor 1
			expect(mockFetchAdvisor.mock.calls[2][1].length).toBe(3); // User + advisor 1 + advisor 2
		});

		it('synthesis receives all messages', async () => {
			// Each call needs fresh responses
			mockFetchAdvisor
				.mockResolvedValueOnce(createTextStreamResponse('Response 1'))
				.mockResolvedValueOnce(createTextStreamResponse('Response 2'))
				.mockResolvedValueOnce(createTextStreamResponse('Response 3'));
			mockFetchSynthesis.mockResolvedValue(createTextStreamResponse('Synthesis'));

			const bt = new BrainTrust(mockConfig);
			await bt.start('Question?', testAdvisors);

			expect(mockFetchSynthesis).toHaveBeenCalledTimes(1);
			const messagesPassedToSynthesis = mockFetchSynthesis.mock.calls[0][0];
			expect(messagesPassedToSynthesis.length).toBe(4); // User + 3 advisors
		});
	});

	describe('streaming state', () => {
		it('sets streamingAdvisorId during advisor query', async () => {
			let capturedStreamingIds: (string | null)[] = [];

			mockFetchAdvisor.mockImplementation(async (advisor: Advisor) => {
				// Capture the streaming ID at the start of each fetch
				capturedStreamingIds.push(advisor.id);
				return createTextStreamResponse('Response');
			});
			mockFetchSynthesis.mockResolvedValue(createTextStreamResponse('Synthesis'));

			const bt = new BrainTrust(mockConfig);
			await bt.start('Question?', [testAdvisors[0], testAdvisors[1]]);

			// Both advisors should have had their ID set during streaming
			expect(capturedStreamingIds).toEqual(['advisor-1', 'advisor-2']);

			// After completion, streaming ID should be null
			expect(bt.streamingAdvisorId).toBeNull();
		});

		it('clears streamingContent after each advisor completes', async () => {
			mockFetchAdvisor.mockResolvedValue(createTextStreamResponse('Response'));
			mockFetchSynthesis.mockResolvedValue(createTextStreamResponse('Synthesis'));

			const bt = new BrainTrust(mockConfig);
			await bt.start('Question?', [testAdvisors[0]]);

			expect(bt.streamingContent).toBe('');
		});
	});

	describe('loadMessages', () => {
		it('loads existing messages from database', () => {
			const bt = new BrainTrust(mockConfig);

			const existingMessages: Message[] = [
				{ id: 'msg-1', role: 'user', content: 'What should I do?' },
				{ id: 'msg-2', role: 'advisor', content: 'Consider your options.', advisorId: 'advisor-1' },
				{ id: 'msg-3', role: 'advisor', content: 'Think carefully.', advisorId: 'advisor-2' }
			];

			bt.loadMessages(existingMessages);

			expect(bt.messages).toEqual(existingMessages);
			expect(bt.status).toBe('complete');
		});

		it('loads synthesis content when provided', () => {
			const bt = new BrainTrust(mockConfig);

			const existingMessages: Message[] = [
				{ id: 'msg-1', role: 'user', content: 'Question?' }
			];

			bt.loadMessages(existingMessages, 'This is the synthesis content.');

			expect(bt.synthesisContent).toBe('This is the synthesis content.');
		});

		it('sets status to idle when no messages provided', () => {
			const bt = new BrainTrust(mockConfig);

			bt.loadMessages([]);

			expect(bt.status).toBe('idle');
		});

		it('resets state before loading new messages', async () => {
			mockFetchAdvisor.mockResolvedValue(createTextStreamResponse('Response'));
			mockFetchSynthesis.mockResolvedValue(createTextStreamResponse('Synthesis'));

			const bt = new BrainTrust(mockConfig);
			await bt.start('First question?', [testAdvisors[0]]);

			const newMessages: Message[] = [
				{ id: 'new-1', role: 'user', content: 'New question?' }
			];

			bt.loadMessages(newMessages);

			expect(bt.messages).toEqual(newMessages);
			expect(bt.streamingContent).toBe('');
			expect(bt.streamingAdvisorId).toBeNull();
			expect(bt.error).toBeNull();
		});
	});
});
