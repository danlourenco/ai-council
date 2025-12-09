/**
 * Brain Trust - Multi-advisor orchestration for AI applications
 * Core state machine using Svelte 5 runes
 */

import type { Advisor, Message, BrainTrustConfig, BrainTrustStatus, BrainTrustProgress } from './types';

/**
 * BrainTrust orchestrates multiple AI advisors responding sequentially
 * to a single question, followed by a synthesis.
 *
 * Each advisor sees all previous responses, enabling debate and critique.
 *
 * @example
 * ```typescript
 * const brainTrust = new BrainTrust({
 *   fetchAdvisor: async (advisor, messages) => {
 *     return fetch('/api/chat', {
 *       method: 'POST',
 *       body: JSON.stringify({ advisorId: advisor.id, messages })
 *     });
 *   },
 *   fetchSynthesis: async (messages) => {
 *     return fetch('/api/synthesis', {
 *       method: 'POST',
 *       body: JSON.stringify({ messages })
 *     });
 *   },
 *   parseStream: parseAISDKStream
 * });
 *
 * await brainTrust.start('What should I do?', [advisor1, advisor2]);
 * ```
 */
export class BrainTrust {
	// ═══════════════════════════════════════════════════════════════════
	// Reactive State (Svelte 5 $state runes)
	// ═══════════════════════════════════════════════════════════════════

	/** All messages in the conversation (user + advisor responses) */
	messages = $state<Message[]>([]);

	/** Current status of the Brain Trust flow */
	status = $state<BrainTrustStatus>('idle');

	/** Index of the currently active advisor (0-based) */
	currentAdvisorIndex = $state(0);

	/** Content being streamed from the current advisor */
	streamingContent = $state('');

	/** ID of the advisor currently streaming (null if not streaming) */
	streamingAdvisorId = $state<string | null>(null);

	/** Content of the synthesis (accumulated during streaming) */
	synthesisContent = $state('');

	/** Error message if something went wrong */
	error = $state<string | null>(null);

	// ═══════════════════════════════════════════════════════════════════
	// Private State (Non-reactive)
	// ═══════════════════════════════════════════════════════════════════

	private advisors: Advisor[] = [];
	private config: BrainTrustConfig;
	private abortController: AbortController | null = null;

	// ═══════════════════════════════════════════════════════════════════
	// Constructor
	// ═══════════════════════════════════════════════════════════════════

	constructor(config: BrainTrustConfig) {
		this.config = config;
	}

	// ═══════════════════════════════════════════════════════════════════
	// Derived State (Getters)
	// ═══════════════════════════════════════════════════════════════════

	/** The currently active advisor, or null if not querying */
	get currentAdvisor(): Advisor | null {
		return this.advisors[this.currentAdvisorIndex] ?? null;
	}

	/** Whether the Brain Trust flow has completed (success or error) */
	get isComplete(): boolean {
		return this.status === 'complete' || this.status === 'error';
	}

	/** Whether the Brain Trust is currently active (querying or synthesizing) */
	get isActive(): boolean {
		return this.status === 'querying' || this.status === 'synthesizing';
	}

	/** Progress information for UI display */
	get progress(): BrainTrustProgress {
		return {
			current: this.currentAdvisorIndex,
			total: this.advisors.length,
			phase: this.status
		};
	}

	/** All advisors that have completed their responses */
	get completedAdvisors(): Advisor[] {
		return this.advisors.slice(0, this.currentAdvisorIndex + (this.streamingAdvisorId ? 0 : 1));
	}

	// ═══════════════════════════════════════════════════════════════════
	// Public API
	// ═══════════════════════════════════════════════════════════════════

	/**
	 * Start the Brain Trust flow.
	 *
	 * @param question - The user's question
	 * @param advisors - Array of advisors to query (in order)
	 */
	async start(question: string, advisors: Advisor[]): Promise<void> {
		if (advisors.length === 0) {
			throw new Error('At least one advisor is required');
		}

		this.reset();
		this.advisors = advisors;
		this.abortController = new AbortController();

		// Add user message
		const userMessage: Message = {
			id: crypto.randomUUID(),
			role: 'user',
			content: question
		};
		this.messages = [userMessage];
		this.status = 'querying';

		try {
			// Query each advisor sequentially
			for (let i = 0; i < advisors.length; i++) {
				if (this.abortController.signal.aborted) {
					this.status = 'idle';
					return;
				}

				this.currentAdvisorIndex = i;
				await this.queryAdvisor(advisors[i]);
			}

			// Trigger synthesis
			if (!this.abortController.signal.aborted) {
				this.status = 'synthesizing';
				await this.synthesize();
				this.status = 'complete';
			}
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'An unknown error occurred';
			this.status = 'error';
			throw err;
		}
	}

	/**
	 * Abort the current Brain Trust flow.
	 * Stops streaming and resets to idle state.
	 */
	abort(): void {
		if (this.abortController) {
			this.abortController.abort();
			this.abortController = null;
		}
		this.streamingAdvisorId = null;
		this.streamingContent = '';
		this.status = 'idle';
	}

	/**
	 * Reset all state to initial values.
	 */
	reset(): void {
		this.abort();
		this.messages = [];
		this.status = 'idle';
		this.currentAdvisorIndex = 0;
		this.streamingContent = '';
		this.streamingAdvisorId = null;
		this.synthesisContent = '';
		this.error = null;
		this.advisors = [];
	}

	/**
	 * Load existing messages (e.g., from database) into the Brain Trust.
	 * This is used when viewing a completed Brain Trust conversation.
	 *
	 * @param messages - Array of messages to load
	 * @param synthesisContent - Optional synthesis content to display
	 */
	loadMessages(messages: Message[], synthesisContent?: string): void {
		this.reset();
		this.messages = messages;
		this.synthesisContent = synthesisContent ?? '';
		this.status = messages.length > 0 ? 'complete' : 'idle';
	}

	// ═══════════════════════════════════════════════════════════════════
	// Private Methods
	// ═══════════════════════════════════════════════════════════════════

	/**
	 * Query a single advisor and stream their response.
	 */
	private async queryAdvisor(advisor: Advisor): Promise<void> {
		this.streamingAdvisorId = advisor.id;
		this.streamingContent = '';

		try {
			const response = await this.config.fetchAdvisor(advisor, this.messages);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Advisor ${advisor.name} failed: ${errorText}`);
			}

			// Stream the response
			for await (const chunk of this.config.parseStream(response)) {
				if (this.abortController?.signal.aborted) break;
				this.streamingContent += chunk;
			}

			// Create the completed message
			const advisorMessage: Message = {
				id: crypto.randomUUID(),
				role: 'advisor',
				content: this.streamingContent,
				advisorId: advisor.id
			};

			// Add to messages array (creates new array for reactivity)
			this.messages = [...this.messages, advisorMessage];

			// Notify callback
			this.config.onAdvisorComplete?.(advisor, advisorMessage);
		} catch (err) {
			this.config.onError?.(err instanceof Error ? err : new Error(String(err)), 'advisor', advisor);
			throw err;
		} finally {
			this.streamingAdvisorId = null;
			this.streamingContent = '';
		}
	}

	/**
	 * Generate the synthesis from all advisor responses.
	 */
	private async synthesize(): Promise<void> {
		this.synthesisContent = '';

		try {
			const response = await this.config.fetchSynthesis(this.messages);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Synthesis failed: ${errorText}`);
			}

			// Stream the synthesis
			for await (const chunk of this.config.parseStream(response)) {
				if (this.abortController?.signal.aborted) break;
				this.synthesisContent += chunk;
			}

			// Notify callback
			this.config.onSynthesisComplete?.(this.synthesisContent);
		} catch (err) {
			this.config.onError?.(err instanceof Error ? err : new Error(String(err)), 'synthesis');
			throw err;
		}
	}
}
