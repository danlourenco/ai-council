import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'node',
		globals: true,
		setupFiles: ['src/tests/setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			exclude: [
				'node_modules/',
				'.svelte-kit/',
				'.storybook/',
				'**/*.stories.svelte',
				'**/*.d.ts'
			]
		}
	}
});
