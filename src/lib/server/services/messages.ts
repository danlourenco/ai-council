import { eq, desc, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { Database } from '../db';
import { messages, type NewMessage, type Message, type MessageRole } from '../db/schema';

export class MessageService {
	constructor(private db: Database) {}

	async listByConversation(conversationId: string): Promise<Message[]> {
		return this.db.query.messages.findMany({
			where: eq(messages.conversationId, conversationId),
			orderBy: [messages.createdAt]
		});
	}

	async create(
		data: {
			conversationId: string;
			role: MessageRole;
			content: string;
			modelId?: string;
			personaId?: string;
			parentMessageId?: string;
			critiqueOfMessageId?: string;
			metadata?: Record<string, unknown>;
		},
		userId: string
	): Promise<Message> {
		const id = nanoid();
		const now = new Date();

		const newMessage: NewMessage = {
			id,
			conversationId: data.conversationId,
			role: data.role,
			content: data.content,
			modelId: data.modelId ?? null,
			personaId: data.personaId ?? null,
			parentMessageId: data.parentMessageId ?? null,
			critiqueOfMessageId: data.critiqueOfMessageId ?? null,
			createdBy: userId,
			metadata: data.metadata ? JSON.stringify(data.metadata) : null,
			createdAt: now
		};

		await this.db.insert(messages).values(newMessage);

		return newMessage as Message;
	}

	async get(id: string): Promise<Message | undefined> {
		return this.db.query.messages.findFirst({
			where: eq(messages.id, id)
		});
	}

	async getByIds(ids: string[]): Promise<Message[]> {
		if (ids.length === 0) return [];
		return this.db.query.messages.findMany({
			where: inArray(messages.id, ids),
			orderBy: [messages.createdAt]
		});
	}

	async getByParentId(parentMessageId: string): Promise<Message[]> {
		return this.db.query.messages.findMany({
			where: eq(messages.parentMessageId, parentMessageId),
			orderBy: [messages.createdAt]
		});
	}
}
