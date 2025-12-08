<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ConversationListItem from './ConversationListItem.svelte';

	const { Story } = defineMeta({
		title: 'UI/ConversationListItem',
		component: ConversationListItem,
		tags: ['autodocs'],
		argTypes: {
			title: { control: 'text' },
			href: { control: 'text' },
			active: { control: 'boolean' }
		}
	});
</script>

<Story name="Default" asChild>
	<div class="w-56 bg-base-100 p-2 rounded-lg">
		<ConversationListItem id="1" title="Should we buy a new car?" href="/chat/1" />
	</div>
</Story>

<Story name="Active" asChild>
	<div class="w-56 bg-base-100 p-2 rounded-lg">
		<ConversationListItem id="1" title="Should we buy a new car?" href="/chat/1" active={true} />
	</div>
</Story>

<Story name="Long Title" asChild>
	<div class="w-56 bg-base-100 p-2 rounded-lg">
		<ConversationListItem id="2" title="What are the best strategies for long-term investment planning and retirement savings?" href="/chat/2" />
	</div>
</Story>

<Story name="List" asChild>
	<div class="w-56 bg-base-100 p-2 rounded-lg space-y-1">
		<ConversationListItem id="1" title="Should we buy a new car?" href="/chat/1" active={true} />
		<ConversationListItem id="2" title="Kitchen renovation ideas" href="/chat/2" />
		<ConversationListItem id="3" title="Vacation planning for summer" href="/chat/3" />
		<ConversationListItem id="4" title="Best schools in the area" href="/chat/4" />
	</div>
</Story>
