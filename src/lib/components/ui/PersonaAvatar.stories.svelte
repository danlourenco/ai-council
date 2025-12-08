<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import PersonaAvatar from './PersonaAvatar.svelte';

	const { Story } = defineMeta({
		title: 'UI/PersonaAvatar',
		component: PersonaAvatar,
		tags: ['autodocs'],
		argTypes: {
			emoji: { control: 'text' },
			accentColor: { control: 'color' },
			size: {
				control: { type: 'select' },
				options: ['sm', 'md', 'lg', 'xl']
			}
		}
	});
</script>

<Story name="The Sage" asChild>
	<PersonaAvatar emoji="🦉" accentColor="#7d9a78" size="md" />
</Story>

<Story name="The Skeptic" asChild>
	<PersonaAvatar emoji="🦊" accentColor="#8b6b8b" size="md" />
</Story>

<Story name="The Strategist" asChild>
	<PersonaAvatar emoji="🦅" accentColor="#6b7b8b" size="md" />
</Story>

<Story name="Small" asChild>
	<PersonaAvatar emoji="🦉" accentColor="#7d9a78" size="sm" />
</Story>

<Story name="Large" asChild>
	<PersonaAvatar emoji="🦉" accentColor="#7d9a78" size="lg" />
</Story>

<Story name="Extra Large" asChild>
	<PersonaAvatar emoji="🦉" accentColor="#7d9a78" size="xl" />
</Story>

<Story name="All Sizes" asChild>
	<div class="flex items-end gap-4">
		<PersonaAvatar emoji="🦉" accentColor="#7d9a78" size="sm" />
		<PersonaAvatar emoji="🦉" accentColor="#7d9a78" size="md" />
		<PersonaAvatar emoji="🦉" accentColor="#7d9a78" size="lg" />
		<PersonaAvatar emoji="🦉" accentColor="#7d9a78" size="xl" />
	</div>
</Story>

<Story name="All Personas" asChild>
	<div class="flex gap-4">
		<PersonaAvatar emoji="🦉" accentColor="#7d9a78" size="lg" />
		<PersonaAvatar emoji="🦊" accentColor="#8b6b8b" size="lg" />
		<PersonaAvatar emoji="🦅" accentColor="#6b7b8b" size="lg" />
	</div>
</Story>
