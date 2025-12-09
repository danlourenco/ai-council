/**
 * Brain Trust - Multi-advisor orchestration for AI applications
 * Stream parsing utilities
 */

/**
 * Parse Vercel AI SDK v5 SSE stream format.
 *
 * The AI SDK v5 uses Server-Sent Events with JSON payloads:
 * - `data: {"type": "text-delta", "delta": "chunk of text"}`
 * - `data: {"type": "start", "messageMetadata": {...}}`
 * - `data: {"type": "finish", ...}`
 * - `data: [DONE]`
 *
 * @param response - Fetch Response with streaming body
 * @yields Text chunks as they arrive
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/chat', { ... });
 * for await (const chunk of parseAISDKStream(response)) {
 *   console.log(chunk); // "Hello", " world", "!"
 * }
 * ```
 */
export async function* parseAISDKStream(response: Response): AsyncGenerator<string> {
	if (!response.body) {
		throw new Error('Response body is null');
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() || '';

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed || !trimmed.startsWith('data: ')) continue;

				const jsonStr = trimmed.slice(6);
				if (jsonStr === '[DONE]') continue;

				try {
					const part = JSON.parse(jsonStr);
					// Handle both 'text-delta' (UI stream) and 'text' (data stream) formats
					if (part.type === 'text-delta' && part.delta) {
						yield part.delta;
					} else if (part.type === 'text' && part.text) {
						// Older AI SDK format
						yield part.text;
					}
				} catch {
					// Skip malformed JSON - might be partial chunk
				}
			}
		}

		// Process any remaining buffer
		if (buffer.trim()) {
			const trimmed = buffer.trim();
			if (trimmed.startsWith('data: ')) {
				const jsonStr = trimmed.slice(6);
				if (jsonStr !== '[DONE]') {
					try {
						const part = JSON.parse(jsonStr);
						if (part.type === 'text-delta' && part.delta) {
							yield part.delta;
						} else if (part.type === 'text' && part.text) {
							yield part.text;
						}
					} catch {
						// Skip malformed JSON
					}
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
}

/**
 * Extract metadata from AI SDK stream start event.
 * Useful for getting conversationId, userMessageId, etc.
 *
 * @param response - Fetch Response with streaming body
 * @returns Promise resolving to metadata object or null
 */
export async function extractStreamMetadata(
	response: Response
): Promise<Record<string, unknown> | null> {
	if (!response.body) return null;

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';

	try {
		// Read just enough to find the start event
		const { done, value } = await reader.read();
		if (done) return null;

		buffer = decoder.decode(value, { stream: true });
		const lines = buffer.split('\n');

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed.startsWith('data: ')) continue;

			const jsonStr = trimmed.slice(6);
			try {
				const part = JSON.parse(jsonStr);
				if (part.type === 'start' && part.messageMetadata) {
					return part.messageMetadata;
				}
			} catch {
				// Skip malformed JSON
			}
		}
	} finally {
		// Note: Don't release lock here if you want to continue reading
	}

	return null;
}
