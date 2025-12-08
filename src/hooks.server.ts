import { createAuth } from '$lib/server/auth';
import { createDb } from '$lib/server/db';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Initialize database
	const db = createDb(event.platform!.env.DB);
	event.locals.db = db;

	// Initialize auth and get session
	const auth = createAuth(
		event.platform!.env.DB,
		event.url.origin,
		event.platform!.env.BETTER_AUTH_SECRET
	);

	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	event.locals.session = session?.session ?? null;
	event.locals.user = session?.user ?? null;

	return resolve(event);
};
