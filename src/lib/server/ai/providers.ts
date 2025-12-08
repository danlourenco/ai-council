import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';

// Model ID to provider mapping
const modelMap: Record<string, (env: Record<string, string>) => LanguageModel> = {
	'claude-sonnet-4': (env) => createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })('claude-sonnet-4-20250514'),
	'claude-opus-4': (env) => createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })('claude-opus-4-20250514'),
	'gpt-4o': (env) => createOpenAI({ apiKey: env.OPENAI_API_KEY })('gpt-4o'),
	'gpt-4o-mini': (env) => createOpenAI({ apiKey: env.OPENAI_API_KEY })('gpt-4o-mini'),
	'gemini-2.0-flash': (env) => createGoogleGenerativeAI({ apiKey: env.GOOGLE_AI_API_KEY })('gemini-2.0-flash-exp'),
	'gemini-1.5-pro': (env) => createGoogleGenerativeAI({ apiKey: env.GOOGLE_AI_API_KEY })('gemini-1.5-pro')
};

export function getModel(modelId: string, env: Record<string, string>): LanguageModel {
	const modelFactory = modelMap[modelId];
	if (!modelFactory) {
		throw new Error(`Unknown model: ${modelId}`);
	}
	return modelFactory(env);
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
