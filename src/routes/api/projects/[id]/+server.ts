import { json } from '@sveltejs/kit';
import { ProjectService } from '$lib/server/services/projects';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const projectService = new ProjectService(locals.db);
	const project = await projectService.get(params.id, locals.user.id);

	if (!project) {
		return json({ error: 'Project not found' }, { status: 404 });
	}

	return json(project);
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = (await request.json()) as { name?: string; description?: string; isShared?: boolean };
	const { name, description, isShared } = body;

	const projectService = new ProjectService(locals.db);
	const project = await projectService.update(params.id, { name, description, isShared }, locals.user.id);

	if (!project) {
		return json({ error: 'Project not found or not authorized' }, { status: 404 });
	}

	return json(project);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const projectService = new ProjectService(locals.db);
	const deleted = await projectService.delete(params.id, locals.user.id);

	if (!deleted) {
		return json({ error: 'Project not found or not authorized' }, { status: 404 });
	}

	return json({ success: true });
};
