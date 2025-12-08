// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			db: import('$lib/server/db').Database;
			session: {
				id: string;
				createdAt: Date;
				updatedAt: Date;
				userId: string;
				expiresAt: Date;
				token: string;
				ipAddress?: string | null;
				userAgent?: string | null;
			} | null;
			user: {
				name: string;
				id: string;
				email: string;
				emailVerified: boolean;
				image?: string | null;
				createdAt: Date;
				updatedAt: Date;
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				DB: D1Database;
				ANTHROPIC_API_KEY?: string;
				OPENAI_API_KEY?: string;
				GOOGLE_AI_API_KEY?: string;
				BETTER_AUTH_SECRET?: string;
			};
		}
	}
}

export {};

