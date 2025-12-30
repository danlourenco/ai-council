import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';

describe('/api/council endpoint', () => {
	let mockLocals: any;
	let mockPlatform: any;

	beforeEach(() => {
		mockLocals = {
			user: { id: 'test-user-id', name: 'Test User' },
			db: {
				// Mock D1 database
			}
		};

		mockPlatform = {
			env: {
				ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || 'test-key',
				OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'test-key',
				GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY || 'test-key'
			}
		};
	});

	it('returns 401 if user is not authenticated', async () => {
		const request = new Request('http://localhost/api/council', {
			method: 'POST',
			body: JSON.stringify({ question: 'test' })
		});

		const event = {
			request,
			locals: { user: null, db: mockLocals.db },
			platform: mockPlatform
		} as unknown as RequestEvent;

		const response = await POST(event);

		expect(response.status).toBe(401);
	});

	it('returns 400 if question is missing', async () => {
		const request = new Request('http://localhost/api/council', {
			method: 'POST',
			body: JSON.stringify({})
		});

		const event = {
			request,
			locals: mockLocals,
			platform: mockPlatform
		} as unknown as RequestEvent;

		const response = await POST(event);

		expect(response.status).toBe(400);
	});

	it.todo('orchestrates three advisors in sequence', async () => {
		// This would require mocking the entire D1 database and AI responses
		// For now, we'll test manually with the test script
	});
});
