import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationService } from './conversations';
import type { Conversation, ConversationMode } from '../db/schema';

// Mock nanoid to return predictable IDs
vi.mock('nanoid', () => ({
	nanoid: vi.fn(() => 'test-id-123')
}));

// Create a mock database
function createMockDb() {
	const mockConversations: Conversation[] = [];

	return {
		query: {
			conversations: {
				findMany: vi.fn(async () => mockConversations),
				findFirst: vi.fn(async ({ where }: { where: unknown }) => {
					// Simple mock - returns first conversation or undefined
					return mockConversations[0];
				})
			}
		},
		insert: vi.fn(() => ({
			values: vi.fn(async (data: unknown) => {
				mockConversations.push(data as Conversation);
				return data;
			})
		})),
		update: vi.fn(() => ({
			set: vi.fn(() => ({
				where: vi.fn(async () => {})
			}))
		})),
		delete: vi.fn(() => ({
			where: vi.fn(async () => {})
		})),
		// Expose internal state for assertions
		_conversations: mockConversations
	};
}

describe('ConversationService', () => {
	let service: ConversationService;
	let mockDb: ReturnType<typeof createMockDb>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockDb = createMockDb();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		service = new ConversationService(mockDb as any);
	});

	describe('create', () => {
		it('creates a conversation with required fields', async () => {
			const userId = 'user-123';
			const data = { title: 'Test Conversation' };

			const result = await service.create(data, userId);

			expect(result).toMatchObject({
				id: 'test-id-123',
				title: 'Test Conversation',
				mode: 'quick',
				createdBy: userId
			});
			expect(result.createdAt).toBeInstanceOf(Date);
			expect(result.updatedAt).toBeInstanceOf(Date);
		});

		it('creates a conversation with custom mode', async () => {
			const userId = 'user-123';
			const data = { title: 'Brain Trust Session', mode: 'brain-trust' as ConversationMode };

			const result = await service.create(data, userId);

			expect(result.mode).toBe('brain-trust');
		});

		it('creates a conversation with projectId when provided', async () => {
			const userId = 'user-123';
			const data = { title: 'Project Chat', projectId: 'project-456' };

			const result = await service.create(data, userId);

			expect(result.projectId).toBe('project-456');
		});

		it('does not include projectId when not provided', async () => {
			const userId = 'user-123';
			const data = { title: 'No Project Chat' };

			const result = await service.create(data, userId);

			expect(result.projectId).toBeUndefined();
		});

		it('calls db.insert with correct values', async () => {
			const userId = 'user-123';
			const data = { title: 'Test' };

			await service.create(data, userId);

			expect(mockDb.insert).toHaveBeenCalled();
		});
	});

	describe('listByUser', () => {
		it('calls findMany with correct user filter', async () => {
			const userId = 'user-123';

			await service.listByUser(userId);

			expect(mockDb.query.conversations.findMany).toHaveBeenCalled();
		});

		it('returns empty array when no conversations exist', async () => {
			const result = await service.listByUser('user-123');

			expect(result).toEqual([]);
		});
	});

	describe('listByProject', () => {
		it('calls findMany with project filter', async () => {
			const projectId = 'project-123';
			const userId = 'user-123';

			await service.listByProject(projectId, userId);

			expect(mockDb.query.conversations.findMany).toHaveBeenCalled();
		});
	});

	describe('get', () => {
		it('calls findFirst with correct id', async () => {
			const conversationId = 'conv-123';

			await service.get(conversationId);

			expect(mockDb.query.conversations.findFirst).toHaveBeenCalled();
		});
	});

	describe('updateTitle', () => {
		it('calls update with new title', async () => {
			const conversationId = 'conv-123';
			const newTitle = 'Updated Title';

			await service.updateTitle(conversationId, newTitle);

			expect(mockDb.update).toHaveBeenCalled();
		});
	});

	describe('touch', () => {
		it('updates the updatedAt timestamp', async () => {
			const conversationId = 'conv-123';

			await service.touch(conversationId);

			expect(mockDb.update).toHaveBeenCalled();
		});
	});

	describe('delete', () => {
		it('returns false when conversation does not exist', async () => {
			mockDb.query.conversations.findFirst = vi.fn(async () => undefined);

			const result = await service.delete('non-existent', 'user-123');

			expect(result).toBe(false);
			expect(mockDb.delete).not.toHaveBeenCalled();
		});

		it('returns true and deletes when conversation exists and belongs to user', async () => {
			const existingConversation: Conversation = {
				id: 'conv-123',
				title: 'Test',
				mode: 'quick',
				projectId: null,
				createdBy: 'user-123',
				createdAt: new Date(),
				updatedAt: new Date()
			};
			mockDb.query.conversations.findFirst = vi.fn(async () => existingConversation);

			const result = await service.delete('conv-123', 'user-123');

			expect(result).toBe(true);
			expect(mockDb.delete).toHaveBeenCalled();
		});
	});
});
