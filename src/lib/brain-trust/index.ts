/**
 * Brain Trust - Multi-advisor orchestration for AI applications
 *
 * A Svelte 5 library for orchestrating multiple AI advisors to respond
 * sequentially to a single question, followed by an automatic synthesis.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { BrainTrust, parseAISDKStream } from '$lib/brain-trust';
 *
 *   const brainTrust = new BrainTrust({
 *     fetchAdvisor: async (advisor, messages) => fetch('/api/chat', { ... }),
 *     fetchSynthesis: async (messages) => fetch('/api/synthesis', { ... }),
 *     parseStream: parseAISDKStream
 *   });
 *
 *   async function askQuestion() {
 *     await brainTrust.start('What should I do?', selectedAdvisors);
 *   }
 * </script>
 *
 * {#each brainTrust.messages as message}
 *   <MessageCard {message} />
 * {/each}
 *
 * {#if brainTrust.streamingAdvisorId}
 *   <StreamingCard content={brainTrust.streamingContent} />
 * {/if}
 *
 * {#if brainTrust.synthesisContent}
 *   <SynthesisCard content={brainTrust.synthesisContent} />
 * {/if}
 * ```
 *
 * @packageDocumentation
 */

// Core class
export { BrainTrust } from './brain-trust.svelte';

// Stream parsing utilities
export { parseAISDKStream, extractStreamMetadata } from './stream-parser';

// Types
export type {
	Advisor,
	Message,
	BrainTrustConfig,
	BrainTrustStatus,
	BrainTrustProgress
} from './types';
