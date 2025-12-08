import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Helper for timestamps
const timestamps = {
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
		.$onUpdateFn(() => new Date())
};

// ============================================
// USERS
// ============================================
export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
	image: text('image'),
	createdAt: timestamps.createdAt,
	updatedAt: timestamps.updatedAt
});

export const usersRelations = relations(users, ({ many }) => ({
	projects: many(projects),
	conversations: many(conversations),
	messages: many(messages),
	sessions: many(sessions),
	accounts: many(accounts),
	passkeys: many(passkeys)
}));

// ============================================
// BETTER AUTH TABLES
// ============================================
export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	token: text('token').notNull().unique(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	createdAt: timestamps.createdAt,
	updatedAt: timestamps.updatedAt
});

export const accounts = sqliteTable('accounts', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	password: text('password'), // Required for email/password auth
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
	refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
	scope: text('scope'),
	idToken: text('id_token'),
	createdAt: timestamps.createdAt,
	updatedAt: timestamps.updatedAt
});

export const verifications = sqliteTable('verifications', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	createdAt: timestamps.createdAt,
	updatedAt: timestamps.updatedAt
});

// Passkey table (Better Auth passkey plugin)
// Field names must match Better Auth's expected names exactly (credentialID, not credentialId)
export const passkeys = sqliteTable('passkeys', {
	id: text('id').primaryKey(),
	name: text('name'),
	publicKey: text('public_key').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	credentialID: text('credential_id').notNull().unique(),
	counter: integer('counter').notNull().default(0),
	deviceType: text('device_type').notNull(),
	backedUp: integer('backed_up', { mode: 'boolean' }).notNull().default(false),
	transports: text('transports'), // JSON array stored as string
	aaguid: text('aaguid'),
	createdAt: timestamps.createdAt
});

// ============================================
// PROJECTS
// ============================================
export const projects = sqliteTable(
	'projects',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		description: text('description'),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		isShared: integer('is_shared', { mode: 'boolean' }).notNull().default(true),
		createdAt: timestamps.createdAt,
		updatedAt: timestamps.updatedAt
	},
	(table) => [index('projects_created_by_idx').on(table.createdBy)]
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
	creator: one(users, {
		fields: [projects.createdBy],
		references: [users.id]
	}),
	conversations: many(conversations)
}));

// ============================================
// CONVERSATIONS
// ============================================
export const conversationModeEnum = ['quick', 'second-opinion', 'brain-trust'] as const;
export type ConversationMode = (typeof conversationModeEnum)[number];

export const conversations = sqliteTable(
	'conversations',
	{
		id: text('id').primaryKey(),
		// projectId is optional for Phase 1 - will be used in future for organizing conversations
		projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
		title: text('title').notNull(),
		mode: text('mode', { enum: conversationModeEnum }).notNull().default('quick'),
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		createdAt: timestamps.createdAt,
		updatedAt: timestamps.updatedAt
	},
	(table) => [
		index('conversations_project_id_idx').on(table.projectId),
		index('conversations_created_by_idx').on(table.createdBy)
	]
);

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
	project: one(projects, {
		fields: [conversations.projectId],
		references: [projects.id]
	}),
	creator: one(users, {
		fields: [conversations.createdBy],
		references: [users.id]
	}),
	messages: many(messages)
}));

// ============================================
// PERSONAS
// ============================================
export const personas = sqliteTable('personas', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	role: text('role').notNull(),
	systemPrompt: text('system_prompt').notNull(),
	defaultModelId: text('default_model_id').notNull(),
	avatarEmoji: text('avatar_emoji').notNull(),
	accentColor: text('accent_color').notNull(), // Hex color
	isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
	createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
	createdAt: timestamps.createdAt,
	updatedAt: timestamps.updatedAt
});

export const personasRelations = relations(personas, ({ one, many }) => ({
	creator: one(users, {
		fields: [personas.createdBy],
		references: [users.id]
	}),
	messages: many(messages)
}));

// ============================================
// MESSAGES
// ============================================
export const messageRoleEnum = ['user', 'advisor', 'synthesis'] as const;
export type MessageRole = (typeof messageRoleEnum)[number];

export const messages = sqliteTable(
	'messages',
	{
		id: text('id').primaryKey(),
		conversationId: text('conversation_id')
			.notNull()
			.references(() => conversations.id, { onDelete: 'cascade' }),
		role: text('role', { enum: messageRoleEnum }).notNull(),
		content: text('content').notNull(),
		modelId: text('model_id'), // e.g., 'claude-sonnet-4', 'gpt-4o'
		personaId: text('persona_id').references(() => personas.id, { onDelete: 'set null' }),
		parentMessageId: text('parent_message_id'), // Self-reference for threading
		critiqueOfMessageId: text('critique_of_message_id'), // Self-reference for critiques
		createdBy: text('created_by')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		metadata: text('metadata'), // JSON string for token counts, latency, etc.
		createdAt: timestamps.createdAt
	},
	(table) => [
		index('messages_conversation_id_idx').on(table.conversationId),
		index('messages_persona_id_idx').on(table.personaId),
		index('messages_parent_message_id_idx').on(table.parentMessageId)
	]
);

export const messagesRelations = relations(messages, ({ one }) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id]
	}),
	persona: one(personas, {
		fields: [messages.personaId],
		references: [personas.id]
	}),
	creator: one(users, {
		fields: [messages.createdBy],
		references: [users.id]
	}),
	parentMessage: one(messages, {
		fields: [messages.parentMessageId],
		references: [messages.id],
		relationName: 'messageThread'
	}),
	critiqueOf: one(messages, {
		fields: [messages.critiqueOfMessageId],
		references: [messages.id],
		relationName: 'messageCritique'
	})
}));

// ============================================
// TYPE EXPORTS
// ============================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Persona = typeof personas.$inferSelect;
export type NewPersona = typeof personas.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
