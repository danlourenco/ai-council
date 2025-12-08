<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AlertBanner from './AlertBanner.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'UI/AlertBanner',
		component: AlertBanner,
		tags: ['autodocs'],
		argTypes: {
			type: {
				control: { type: 'select' },
				options: ['error', 'warning', 'info', 'success']
			},
			message: { control: 'text' },
			dismissible: { control: 'boolean' }
		},
		args: {
			onDismiss: fn()
		}
	});
</script>

<Story name="Error" asChild>
	<AlertBanner type="error" message="Something went wrong. Please try again." />
</Story>

<Story name="Warning" asChild>
	<AlertBanner type="warning" message="Your session will expire in 5 minutes." />
</Story>

<Story name="Info" asChild>
	<AlertBanner type="info" message="A new version is available." />
</Story>

<Story name="Success" asChild>
	<AlertBanner type="success" message="Your changes have been saved." />
</Story>

<Story name="Dismissible" asChild>
	<AlertBanner type="info" message="This alert can be dismissed." dismissible={true} onDismiss={() => {}} />
</Story>
