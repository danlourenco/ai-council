import { redirect } from '@sveltejs/kit';
import { PersonaService } from '$lib/server/services/personas';
import { ConversationService } from '$lib/server/services/conversations';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const personaService = new PersonaService(locals.db);
	const conversationService = new ConversationService(locals.db);

	// Seed default personas if needed
	await personaService.seedDefaults();

	const [personas, conversations] = await Promise.all([
		personaService.list(),
		conversationService.listByUser(locals.user.id)
	]);

	return {
		user: locals.user,
		personas,
		conversations
	};
};
