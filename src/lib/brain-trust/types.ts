/**
 * Brain Trust - Multi-advisor orchestration for AI applications
 * Types and interfaces
 */

/**
 * An advisor that can respond to questions
 */
export interface Advisor {
	id: string;
	name: string;
	systemPrompt?: string;
	modelId?: string;
	/** Extensible for app-specific metadata */
	[key: string]: unknown;
}

/**
 * A message in the Brain Trust conversation
 */
export interface Message {
	id: string;
	role: 'user' | 'advisor' | 'synthesis';
	content: string;
	advisorId?: string;
	metadata?: Record<string, unknown>;
}

/**
 * Status of the Brain Trust flow
 */
export type BrainTrustStatus = 'idle' | 'querying' | 'synthesizing' | 'complete' | 'error';

/**
 * Progress information for the Brain Trust flow
 */
export interface BrainTrustProgress {
	/** Current advisor index (0-based) */
	current: number;
	/** Total number of advisors */
	total: number;
	/** Current phase */
	phase: BrainTrustStatus;
}

/**
 * Configuration for the BrainTrust class
 */
export interface BrainTrustConfig {
	/**
	 * Fetch function to query an advisor.
	 * Should return a streaming Response.
	 */
	fetchAdvisor: (advisor: Advisor, messages: Message[]) => Promise<Response>;

	/**
	 * Fetch function to generate synthesis.
	 * Should return a streaming Response.
	 */
	fetchSynthesis: (messages: Message[]) => Promise<Response>;

	/**
	 * Stream parser - async generator yielding text chunks.
	 * Use parseAISDKStream for Vercel AI SDK v5 format.
	 */
	parseStream: (response: Response) => AsyncGenerator<string>;

	/**
	 * Optional callback when an advisor completes
	 */
	onAdvisorComplete?: (advisor: Advisor, response: Message) => void;

	/**
	 * Optional callback when synthesis completes
	 */
	onSynthesisComplete?: (synthesis: string) => void;

	/**
	 * Optional callback on error
	 */
	onError?: (error: Error, phase: 'advisor' | 'synthesis', advisor?: Advisor) => void;
}
