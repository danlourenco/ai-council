import { eq, or, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { Database } from '../db';
import { personas, type NewPersona, type Persona } from '../db/schema';
import { DEFAULT_PERSONAS } from '../db/seed';

export class PersonaService {
	constructor(private db: Database) {}

	async list(): Promise<Persona[]> {
		return this.db.query.personas.findMany({
			orderBy: [desc(personas.isDefault), desc(personas.createdAt)]
		});
	}

	async get(id: string): Promise<Persona | undefined> {
		return this.db.query.personas.findFirst({
			where: eq(personas.id, id)
		});
	}

	async getDefaults(): Promise<Persona[]> {
		return this.db.query.personas.findMany({
			where: eq(personas.isDefault, true)
		});
	}

	async update(
		id: string,
		data: { name?: string; role?: string; systemPrompt?: string; defaultModelId?: string },
		userId: string
	): Promise<Persona | undefined> {
		const existing = await this.get(id);
		if (!existing) {
			return undefined;
		}

		const updatedAt = new Date();

		await this.db
			.update(personas)
			.set({
				...(data.name !== undefined && { name: data.name }),
				...(data.role !== undefined && { role: data.role }),
				...(data.systemPrompt !== undefined && { systemPrompt: data.systemPrompt }),
				...(data.defaultModelId !== undefined && { defaultModelId: data.defaultModelId }),
				updatedAt
			})
			.where(eq(personas.id, id));

		return this.get(id);
	}

	async seedDefaults(): Promise<void> {
		// Check if defaults already exist
		const existing = await this.getDefaults();
		if (existing.length > 0) {
			return;
		}

		// Insert default personas
		const now = new Date();
		for (const persona of DEFAULT_PERSONAS) {
			await this.db.insert(personas).values({
				...persona,
				id: nanoid(),
				createdAt: now,
				updatedAt: now
			});
		}
	}
}
