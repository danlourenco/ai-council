<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import PersonaPreviewCard from './PersonaPreviewCard.svelte';

	const { Story } = defineMeta({
		title: 'UI/PersonaPreviewCard',
		component: PersonaPreviewCard,
		tags: ['autodocs'],
		argTypes: {
			emoji: { control: 'text' },
			name: { control: 'text' },
			accentColor: { control: 'color' }
		}
	});
</script>

<Story name="The Sage" asChild>
	<PersonaPreviewCard emoji="🦉" name="The Sage" accentColor="#7d9a78" />
</Story>

<Story name="The Skeptic" asChild>
	<PersonaPreviewCard emoji="🦊" name="The Skeptic" accentColor="#8b6b8b" />
</Story>

<Story name="The Strategist" asChild>
	<PersonaPreviewCard emoji="🦅" name="The Strategist" accentColor="#6b7b8b" />
</Story>

<Story name="All Personas" asChild>
	<div class="flex gap-4">
		<PersonaPreviewCard emoji="🦉" name="The Sage" accentColor="#7d9a78" />
		<PersonaPreviewCard emoji="🦊" name="The Skeptic" accentColor="#8b6b8b" />
		<PersonaPreviewCard emoji="🦅" name="The Strategist" accentColor="#6b7b8b" />
	</div>
</Story>
