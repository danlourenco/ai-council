import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { passkey } from '@better-auth/passkey';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './db/schema';

export function createAuth(d1: D1Database, baseURL: string, secret?: string) {
	const db = drizzle(d1, { schema });

	return betterAuth({
		secret: secret || 'dev-secret-change-in-production-min-32-chars!!',
		database: drizzleAdapter(db, {
			provider: 'sqlite',
			schema: {
				user: schema.users,
				session: schema.sessions,
				account: schema.accounts,
				verification: schema.verifications,
				passkey: schema.passkeys
			}
		}),
		baseURL,
		emailAndPassword: {
			enabled: true,
			// We use a temporary password for initial signup, then add passkey
			requireEmailVerification: false,
			// Use a faster hash for Cloudflare Workers (scrypt can timeout)
			password: {
				hash: async (password) => {
					// Simple hash for temporary passwords - passkeys are the real auth
					const encoder = new TextEncoder();
					const data = encoder.encode(password);
					const hashBuffer = await crypto.subtle.digest('SHA-256', data);
					const hashArray = Array.from(new Uint8Array(hashBuffer));
					return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
				},
				verify: async (data) => {
					const encoder = new TextEncoder();
					const passwordData = encoder.encode(data.password);
					const hashBuffer = await crypto.subtle.digest('SHA-256', passwordData);
					const hashArray = Array.from(new Uint8Array(hashBuffer));
					const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
					return hash === data.hash;
				}
			}
		},
		plugins: [
			passkey({
				rpID: baseURL.includes('localhost') ? 'localhost' : new URL(baseURL).hostname,
				rpName: 'The Council',
				origin: baseURL
			})
		],
		session: {
			expiresIn: 60 * 60 * 24 * 30, // 30 days
			updateAge: 60 * 60 * 24 // Update session every day
		}
	});
}

export type Auth = ReturnType<typeof createAuth>;
