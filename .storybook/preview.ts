import type { Preview } from '@storybook/sveltekit';
import '../src/app.css';

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		},
		backgrounds: {
			default: 'council',
			values: [
				{ name: 'council', value: '#f4f1ea' },
				{ name: 'warm', value: '#faf8f4' },
				{ name: 'dark', value: '#2d2a24' }
			]
		}
	},
	decorators: [
		(Story) => ({
			Component: Story,
			props: {
				style: 'font-family: "DM Sans", sans-serif;'
			}
		})
	]
};

export default preview;