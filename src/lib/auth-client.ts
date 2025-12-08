import { createAuthClient } from 'better-auth/svelte';
import { passkeyClient } from '@better-auth/passkey/client';

export const authClient = createAuthClient({
	baseURL: typeof window !== 'undefined' ? window.location.origin : '',
	plugins: [passkeyClient()]
});

export const { signIn, signOut, signUp, useSession, passkey } = authClient;

// Passkey helpers with better names for our use case
export const registerPasskey = passkey.addPasskey;
export const authenticateWithPasskey = signIn.passkey;
