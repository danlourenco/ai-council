/**
 * AI Model metadata for UI display
 * This file is safe to import on both client and server
 */

export interface ModelInfo {
	id: string;
	name: string;
	provider: 'Anthropic' | 'OpenAI' | 'Google';
}

/**
 * Available AI models with display metadata
 */
export const AVAILABLE_MODELS: ModelInfo[] = [
	{ id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
	{ id: 'claude-opus-4', name: 'Claude Opus 4', provider: 'Anthropic' },
	{ id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
	{ id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
	{ id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google' },
	{ id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google' }
];

/**
 * Get model info by ID
 */
export function getModelInfo(modelId: string): ModelInfo | undefined {
	return AVAILABLE_MODELS.find((m) => m.id === modelId);
}

/**
 * Get models grouped by provider
 */
export function getModelsByProvider(): Record<string, ModelInfo[]> {
	return AVAILABLE_MODELS.reduce(
		(acc, model) => {
			if (!acc[model.provider]) {
				acc[model.provider] = [];
			}
			acc[model.provider].push(model);
			return acc;
		},
		{} as Record<string, ModelInfo[]>
	);
}
