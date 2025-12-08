import { json } from '@sveltejs/kit';
import { PersonaService } from '$lib/server/services/personas';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const personaService = new PersonaService(locals.db);

	// Seed defaults if needed (first time setup)
	await personaService.seedDefaults();

	const personas = await personaService.list();

	return json(personas);
};
