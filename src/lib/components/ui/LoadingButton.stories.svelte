<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import LoadingButton from './LoadingButton.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'UI/LoadingButton',
		component: LoadingButton,
		tags: ['autodocs'],
		argTypes: {
			variant: {
				control: { type: 'select' },
				options: ['primary', 'secondary', 'ghost', 'error']
			},
			size: {
				control: { type: 'select' },
				options: ['sm', 'md', 'lg']
			},
			loading: { control: 'boolean' },
			disabled: { control: 'boolean' },
			fullWidth: { control: 'boolean' }
		},
		args: {
			onclick: fn()
		}
	});
</script>

<Story name="Primary" asChild>
	<LoadingButton variant="primary">Primary Button</LoadingButton>
</Story>

<Story name="Secondary" asChild>
	<LoadingButton variant="secondary">Secondary Button</LoadingButton>
</Story>

<Story name="Ghost" asChild>
	<LoadingButton variant="ghost">Ghost Button</LoadingButton>
</Story>

<Story name="Loading" asChild>
	<LoadingButton loading={true}>Loading...</LoadingButton>
</Story>

<Story name="Disabled" asChild>
	<LoadingButton disabled={true}>Disabled</LoadingButton>
</Story>

<Story name="Large" asChild>
	<LoadingButton size="lg">Large Button</LoadingButton>
</Story>

<Story name="Small" asChild>
	<LoadingButton size="sm">Small Button</LoadingButton>
</Story>

<Story name="Full Width" asChild>
	<div class="w-64">
		<LoadingButton fullWidth={true}>Full Width Button</LoadingButton>
	</div>
</Story>
