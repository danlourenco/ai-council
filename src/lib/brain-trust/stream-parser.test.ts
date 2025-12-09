import { describe, it, expect } from 'vitest';
import { parseAISDKStream, extractStreamMetadata } from './stream-parser';

/**
 * Helper to create a mock Response with streaming body
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

	return new Response(stream);
}

/**
 * Helper to create SSE formatted data lines
 */
function sseData(obj: object | string): string {
	if (typeof obj === 'string') {
		return `data: ${obj}\n`;
	}
	return `data: ${JSON.stringify(obj)}\n`;
}

describe('parseAISDKStream', () => {
	describe('happy path', () => {
		it('parses single text-delta chunk', async () => {
			const response = createMockStreamResponse([
				sseData({ type: 'text-delta', delta: 'Hello' })
			]);

			const chunks: string[] = [];
			for await (const chunk of parseAISDKStream(response)) {
				chunks.push(chunk);
			}

			expect(chunks).toEqual(['Hello']);
		});

		it('parses multiple text-delta chunks', async () => {
			const response = createMockStreamResponse([
				sseData({ type: 'text-delta', delta: 'Hello' }),
				sseData({ type: 'text-delta', delta: ' world' }),
				sseData({ type: 'text-delta', delta: '!' })
			]);

			const chunks: string[] = [];
			for await (const chunk of parseAISDKStream(response)) {
				chunks.push(chunk);
			}

			expect(chunks).toEqual(['Hello', ' world', '!']);
		});

		it('handles chunks split across multiple reads', async () => {
			// Simulate network chunking where SSE lines are split
			const response = createMockStreamResponse([
				'data: {"type":"text-del',
				'ta","delta":"Hello"}\n',
				'data: {"type":"text-delta","delta":" world"}\n'
			]);

			const chunks: string[] = [];
			for await (const chunk of parseAISDKStream(response)) {
				chunks.push(chunk);
			}

			expect(chunks).toEqual(['Hello', ' world']);
		});

		it('handles multiple SSE lines in single chunk', async () => {
			const response = createMockStreamResponse([
				sseData({ type: 'text-delta', delta: 'One' }) +
					sseData({ type: 'text-delta', delta: 'Two' }) +
					sseData({ type: 'text-delta', delta: 'Three' })
			]);

			const chunks: string[] = [];
			for await (const chunk of parseAISDKStream(response)) {
				chunks.push(chunk);
			}

			expect(chunks).toEqual(['One', 'Two', 'Three']);
		});

		it('ignores start events', async () => {
			const response = createMockStreamResponse([
				sseData({ type: 'start', messageMetadata: { id: '123' } }),
				sseData({ type: 'text-delta', delta: 'Hello' })
			]);

			const chunks: string[] = [];
			for await (const chunk of parseAISDKStream(response)) {
				chunks.push(chunk);
			}

			expect(chunks).toEqual(['Hello']);
		});

		it('ignores finish events', async () => {
			const response = createMockStreamResponse([
				sseData({ type: 'text-delta', delta: 'Hello' }),
				sseData({ type: 'finish', finishReason: 'stop' })
			]);

			const chunks: string[] = [];
			for await (const chunk of parseAISDKStream(response)) {
				chunks.push(chunk);
			}

			expect(chunks).toEqual(['Hello']);
		});

		it('ignores [DONE] marker', async () => {
			const response = createMockStreamResponse([
				sseData({ type: 'text-delta', delta: 'Hello' }),
				sseData('[DONE]')
			]);

			const chunks: string[] = [];
			for await (const chunk of parseAISDKStream(response)) {
				chunks.push(chunk);
			}

			expect(chunks).toEqual(['Hello']);
		});

		it('handles empty delta', async () => {
			const response = createMockStreamResponse([
				sseData({ type: 'text-delta', delta: '' }),
				sseData({ type: 'text-delta', delta: 'Hello' })
			]);

			const chunks: string[] = [];
			for await (const chunk of parseAISDKStream(response)) {
				chunks.push(chunk);
			}

			// Empty string is falsy, so it's not yielded
			expect(chunks).toEqual(['Hello']);
		});

		it('handles whitespace-only lines', async () => {
			const response = createMockStreamResponse([
				'   \n',
				'\n',
				sseData({ type: 'text-delta', delta: 'Hello' }),
				'\n'
			]);

			const chunks: string[] = [];
			for await (const chunk of parseAISDKStream(response)) {
				chunks.push(chunk);
			}

			expect(chunks).toEqual(['Hello']);
		});

		it('processes remaining buffer on stream end', async () => {
			// No trailing newline - data sits in buffer until stream ends
			const response = createMockStreamResponse([
				'data: {"type":"text-delta","delta":"Final"}'
			]);

			const chunks: string[] = [];
			for await (const chunk of parseAISDKStream(response)) {
				chunks.push(chunk);
			}

			expect(chunks).toEqual(['Final']);
		});
	});

	describe('error handling', () => {
		it('throws when response body is null', async () => {
			const response = new Response(null);

			await expect(async () => {
				for await (const _ of parseAISDKStream(response)) {
					// consume
				}
			}).rejects.toThrow('Response body is null');
		});

		it('skips malformed JSON lines', async () => {
			const response = createMockStreamResponse([
				'data: {invalid json}\n',
				sseData({ type: 'text-delta', delta: 'Valid' }),
				'data: {"unclosed": \n',
				sseData({ type: 'text-delta', delta: 'Also valid' })
			]);

			const chunks: string[] = [];
			for await (const chunk of parseAISDKStream(response)) {
				chunks.push(chunk);
			}

			expect(chunks).toEqual(['Valid', 'Also valid']);
		});

		it('skips lines without data: prefix', async () => {
			const response = createMockStreamResponse([
				'event: message\n',
				'id: 123\n',
				sseData({ type: 'text-delta', delta: 'Hello' }),
				'retry: 1000\n'
			]);

			const chunks: string[] = [];
			for await (const chunk of parseAISDKStream(response)) {
				chunks.push(chunk);
			}

			expect(chunks).toEqual(['Hello']);
		});

		it('handles text-delta without delta property', async () => {
			const response = createMockStreamResponse([
				sseData({ type: 'text-delta' }), // missing delta
				sseData({ type: 'text-delta', delta: 'Valid' })
			]);

			const chunks: string[] = [];
			for await (const chunk of parseAISDKStream(response)) {
				chunks.push(chunk);
			}

			expect(chunks).toEqual(['Valid']);
		});

		it('handles unknown event types gracefully', async () => {
			const response = createMockStreamResponse([
				sseData({ type: 'unknown-type', data: 'something' }),
				sseData({ type: 'text-delta', delta: 'Hello' }),
				sseData({ type: 'another-unknown' })
			]);

			const chunks: string[] = [];
			for await (const chunk of parseAISDKStream(response)) {
				chunks.push(chunk);
			}

			expect(chunks).toEqual(['Hello']);
		});
	});

	describe('alternate formats', () => {
		it('parses text format (older AI SDK)', async () => {
			const response = createMockStreamResponse([
				sseData({ type: 'text', text: 'Hello' }),
				sseData({ type: 'text', text: ' world' })
			]);

			const chunks: string[] = [];
			for await (const chunk of parseAISDKStream(response)) {
				chunks.push(chunk);
			}

			expect(chunks).toEqual(['Hello', ' world']);
		});

		it('handles mixed text-delta and text formats', async () => {
			const response = createMockStreamResponse([
				sseData({ type: 'text-delta', delta: 'Delta ' }),
				sseData({ type: 'text', text: 'Text' })
			]);

			const chunks: string[] = [];
			for await (const chunk of parseAISDKStream(response)) {
				chunks.push(chunk);
			}

			expect(chunks).toEqual(['Delta ', 'Text']);
		});
	});

	describe('unicode and special characters', () => {
		it('handles unicode characters', async () => {
			const response = createMockStreamResponse([
				sseData({ type: 'text-delta', delta: 'Hello ' }),
				sseData({ type: 'text-delta', delta: '世界' }),
				sseData({ type: 'text-delta', delta: ' 🌍' })
			]);

			const chunks: string[] = [];
			for await (const chunk of parseAISDKStream(response)) {
				chunks.push(chunk);
			}

			expect(chunks).toEqual(['Hello ', '世界', ' 🌍']);
		});

		it('handles newlines in delta', async () => {
			const response = createMockStreamResponse([
				sseData({ type: 'text-delta', delta: 'Line 1\nLine 2' })
			]);

			const chunks: string[] = [];
			for await (const chunk of parseAISDKStream(response)) {
				chunks.push(chunk);
			}

			expect(chunks).toEqual(['Line 1\nLine 2']);
		});

		it('handles special JSON characters in delta', async () => {
			const response = createMockStreamResponse([
				sseData({ type: 'text-delta', delta: 'Quote: "hello"' }),
				sseData({ type: 'text-delta', delta: ' Backslash: \\' })
			]);

			const chunks: string[] = [];
			for await (const chunk of parseAISDKStream(response)) {
				chunks.push(chunk);
			}

			expect(chunks).toEqual(['Quote: "hello"', ' Backslash: \\']);
		});
	});
});

describe('extractStreamMetadata', () => {
	describe('happy path', () => {
		it('extracts metadata from start event', async () => {
			const response = createMockStreamResponse([
				sseData({
					type: 'start',
					messageMetadata: {
						conversationId: 'conv-123',
						personaId: 'persona-456'
					}
				}),
				sseData({ type: 'text-delta', delta: 'Hello' })
			]);

			const metadata = await extractStreamMetadata(response);

			expect(metadata).toEqual({
				conversationId: 'conv-123',
				personaId: 'persona-456'
			});
		});

		it('returns metadata from first chunk only', async () => {
			const response = createMockStreamResponse([
				sseData({
					type: 'start',
					messageMetadata: { id: 'first' }
				})
			]);

			const metadata = await extractStreamMetadata(response);

			expect(metadata).toEqual({ id: 'first' });
		});
	});

	describe('error handling', () => {
		it('returns null when response body is null', async () => {
			const response = new Response(null);

			const metadata = await extractStreamMetadata(response);

			expect(metadata).toBeNull();
		});

		it('returns null when no start event in first chunk', async () => {
			const response = createMockStreamResponse([
				sseData({ type: 'text-delta', delta: 'Hello' })
			]);

			const metadata = await extractStreamMetadata(response);

			expect(metadata).toBeNull();
		});

		it('returns null when start event has no messageMetadata', async () => {
			const response = createMockStreamResponse([
				sseData({ type: 'start' })
			]);

			const metadata = await extractStreamMetadata(response);

			expect(metadata).toBeNull();
		});

		it('returns null on empty stream', async () => {
			const response = createMockStreamResponse([]);

			const metadata = await extractStreamMetadata(response);

			expect(metadata).toBeNull();
		});

		it('handles malformed JSON in start event', async () => {
			// extractStreamMetadata only reads the first chunk, so if the start event
			// is in the same chunk as malformed JSON, it should still find it
			const response = createMockStreamResponse([
				'data: {invalid json}\n' +
					sseData({
						type: 'start',
						messageMetadata: { id: 'valid' }
					})
			]);

			const metadata = await extractStreamMetadata(response);

			// Should find the valid start event in the same chunk
			expect(metadata).toEqual({ id: 'valid' });
		});

		it('returns null when start event is in second chunk', async () => {
			// extractStreamMetadata only reads the first chunk
			const response = createMockStreamResponse([
				'data: {invalid json}\n',
				sseData({
					type: 'start',
					messageMetadata: { id: 'second-chunk' }
				})
			]);

			const metadata = await extractStreamMetadata(response);

			// Only reads first chunk, so returns null
			expect(metadata).toBeNull();
		});
	});
});
