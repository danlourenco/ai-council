import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	ssr: {
		noExternal: ['better-auth', '@better-auth/passkey', 'ms', 'jose', '@noble/ciphers']
	},
	optimizeDeps: {
		include: ['better-auth', 'ms']
	}
});
