import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { Database } from '../db';
import { conversations, type NewConversation, type Conversation, type ConversationMode } from '../db/schema';

export class ConversationService {
	constructor(private db: Database) {}

	async listByUser(userId: string): Promise<Conversation[]> {
		return this.db.query.conversations.findMany({
			where: eq(conversations.createdBy, userId),
			orderBy: [desc(conversations.updatedAt)]
		});
	}

	async listByProject(projectId: string, userId: string): Promise<Conversation[]> {
		return this.db.query.conversations.findMany({
			where: eq(conversations.projectId, projectId),
			orderBy: [desc(conversations.updatedAt)]
		});
	}

	async get(id: string): Promise<Conversation | undefined> {
		return this.db.query.conversations.findFirst({
			where: eq(conversations.id, id)
		});
	}

	async create(
		data: { projectId?: string; title: string; mode?: ConversationMode },
		userId: string
	): Promise<Conversation> {
		const id = nanoid();
		const now = new Date();

		const newConversation: NewConversation = {
			id,
			title: data.title,
			mode: data.mode ?? 'quick',
			createdBy: userId,
			createdAt: now,
			updatedAt: now
		};

		// Only include projectId if it's actually provided
		if (data.projectId) {
			newConversation.projectId = data.projectId;
		}

		await this.db.insert(conversations).values(newConversation);

		return newConversation as Conversation;
	}

	async updateTitle(id: string, title: string): Promise<void> {
		await this.db
			.update(conversations)
			.set({ title, updatedAt: new Date() })
			.where(eq(conversations.id, id));
	}

	async touch(id: string): Promise<void> {
		await this.db
			.update(conversations)
			.set({ updatedAt: new Date() })
			.where(eq(conversations.id, id));
	}

	async delete(id: string, userId: string): Promise<boolean> {
		const existing = await this.db.query.conversations.findFirst({
			where: and(eq(conversations.id, id), eq(conversations.createdBy, userId))
		});

		if (!existing) {
			return false;
		}

		await this.db.delete(conversations).where(eq(conversations.id, id));
		return true;
	}
}
