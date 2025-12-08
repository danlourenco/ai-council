import { error } from '@sveltejs/kit';
import { ConversationService } from '$lib/server/services/conversations';
import { MessageService } from '$lib/server/services/messages';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const conversationService = new ConversationService(locals.db);
	const messageService = new MessageService(locals.db);

	const conversation = await conversationService.get(params.id);

	if (!conversation) {
		throw error(404, 'Conversation not found');
	}

	// Verify the user owns this conversation
	if (conversation.createdBy !== locals.user.id) {
		throw error(403, 'Forbidden');
	}

	const messages = await messageService.listByConversation(params.id);

	return {
		conversation,
		messages
	};
};
