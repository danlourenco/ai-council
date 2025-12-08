import { json } from '@sveltejs/kit';
import { ProjectService } from '$lib/server/services/projects';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const projectService = new ProjectService(locals.db);
	const projects = await projectService.list(locals.user.id);

	return json(projects);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = (await request.json()) as { name?: string; description?: string; isShared?: boolean };
	const { name, description, isShared } = body;

	if (!name || typeof name !== 'string') {
		return json({ error: 'Name is required' }, { status: 400 });
	}

	const projectService = new ProjectService(locals.db);
	const project = await projectService.create({ name, description, isShared }, locals.user.id);

	return json(project, { status: 201 });
};
