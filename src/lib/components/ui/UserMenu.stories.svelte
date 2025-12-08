<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import UserMenu from './UserMenu.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'UI/UserMenu',
		component: UserMenu,
		tags: ['autodocs'],
		argTypes: {
			name: { control: 'text' }
		},
		args: {
			onSignOut: fn()
		}
	});
</script>

<Story name="Default" asChild>
	<div class="w-64 p-4 bg-base-100 rounded-lg">
		<UserMenu name="Dan" onSignOut={() => {}} />
	</div>
</Story>

<Story name="Long Name" asChild>
	<div class="w-64 p-4 bg-base-100 rounded-lg">
		<UserMenu name="Alexandra" onSignOut={() => {}} />
	</div>
</Story>
