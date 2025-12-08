import { createAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

const handleAuth: RequestHandler = async ({ request, platform, url }) => {
	const auth = createAuth(platform!.env.DB, url.origin, platform!.env.BETTER_AUTH_SECRET);
	return auth.handler(request);
};

export const GET = handleAuth;
export const POST = handleAuth;
