import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';

export function createDb(d1: D1Database) {
	return drizzle(d1, { schema });
}

// Re-export DrizzleD1Database type for use elsewhere

export type Database = ReturnType<typeof createDb>;
export * from './schema';
