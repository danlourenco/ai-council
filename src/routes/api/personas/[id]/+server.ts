import { json } from '@sveltejs/kit';
import { PersonaService } from '$lib/server/services/personas';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const personaService = new PersonaService(locals.db);
	const persona = await personaService.get(params.id);

	if (!persona) {
		return json({ error: 'Persona not found' }, { status: 404 });
	}

	return json(persona);
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = (await request.json()) as {
		name?: string;
		role?: string;
		systemPrompt?: string;
		defaultModelId?: string;
	};
	const { name, role, systemPrompt, defaultModelId } = body;

	const personaService = new PersonaService(locals.db);
	const persona = await personaService.update(
		params.id,
		{ name, role, systemPrompt, defaultModelId },
		locals.user.id
	);

	if (!persona) {
		return json({ error: 'Persona not found' }, { status: 404 });
	}

	return json(persona);
};
