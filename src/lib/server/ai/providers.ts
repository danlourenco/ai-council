import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { wrapLanguageModel, type LanguageModel, type LanguageModelV3 } from 'ai';
import { devToolsMiddleware } from '@ai-sdk/devtools';
import { dev } from '$app/environment';

// Re-export model metadata from shared module
export { AVAILABLE_MODELS, getModelInfo, getModelsByProvider } from '$lib/models';
export type { ModelInfo } from '$lib/models';

// Model ID to provider mapping
const modelMap: Record<string, (env: Record<string, string>) => LanguageModel> = {
	'claude-sonnet-4': (env) => createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })('claude-sonnet-4-20250514'),
	'claude-opus-4': (env) => createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })('claude-opus-4-20250514'),
	'gpt-4o': (env) => createOpenAI({ apiKey: env.OPENAI_API_KEY })('gpt-4o'),
	'gpt-4o-mini': (env) => createOpenAI({ apiKey: env.OPENAI_API_KEY })('gpt-4o-mini'),
	'gemini-2.0-flash': (env) => createGoogleGenerativeAI({ apiKey: env.GOOGLE_AI_API_KEY })('gemini-2.0-flash-exp'),
	'gemini-1.5-pro': (env) => createGoogleGenerativeAI({ apiKey: env.GOOGLE_AI_API_KEY })('gemini-1.5-pro')
};

export function getModel(modelId: string, env: Record<string, string>): LanguageModelV3 {
	const modelFactory = modelMap[modelId];
	if (!modelFactory) {
		throw new Error(`Unknown model: ${modelId}`);
	}

	const model = modelFactory(env);

	// Wrap with DevTools middleware in development mode
	if (dev) {
		return wrapLanguageModel({
			model,
			middleware: devToolsMiddleware()
		});
	}

	return model as LanguageModelV3;
}

// Get available models
export function getAvailableModels(): string[] {
	return Object.keys(modelMap);
}

// Default model for each persona
export const defaultPersonaModels: Record<string, string> = {
	'the-sage': 'claude-sonnet-4',
	'the-skeptic': 'gpt-4o',
	'the-strategist': 'gemini-2.0-flash'
};

// Model used for Council Synthesis in Brain Trust mode
export const SYNTHESIS_MODEL_ID = 'claude-sonnet-4';
