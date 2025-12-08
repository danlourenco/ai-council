import { ConversationService } from '$lib/server/services/conversations';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const conversationService = new ConversationService(locals.db);
	const deleted = await conversationService.delete(params.id, locals.user.id);

	if (!deleted) {
		return new Response('Conversation not found', { status: 404 });
	}

	return new Response(null, { status: 204 });
};
