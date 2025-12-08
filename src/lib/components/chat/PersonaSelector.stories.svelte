<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import PersonaSelector from './PersonaSelector.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Chat/PersonaSelector',
		component: PersonaSelector,
		tags: ['autodocs'],
		args: {
			onSelect: fn()
		}
	});

	const personas = [
		{
			id: '1',
			name: 'The Sage',
			role: 'Balanced Wisdom',
			systemPrompt: '',
			defaultModelId: 'claude-sonnet-4',
			avatarEmoji: '🦉',
			accentColor: '#7d9a78',
			isDefault: true,
			createdBy: null,
			createdAt: new Date(),
			updatedAt: new Date()
		},
		{
			id: '2',
			name: 'The Skeptic',
			role: "Devil's Advocate",
			systemPrompt: '',
			defaultModelId: 'gpt-4o',
			avatarEmoji: '🦊',
			accentColor: '#8b6b8b',
			isDefault: true,
			createdBy: null,
			createdAt: new Date(),
			updatedAt: new Date()
		},
		{
			id: '3',
			name: 'The Strategist',
			role: 'Analytical Framework',
			systemPrompt: '',
			defaultModelId: 'gemini-1.5-pro',
			avatarEmoji: '🦅',
			accentColor: '#6b7b8b',
			isDefault: true,
			createdBy: null,
			createdAt: new Date(),
			updatedAt: new Date()
		}
	];
</script>

<Story name="Sage Selected" asChild>
	<PersonaSelector {personas} selected="1" onSelect={() => {}} />
</Story>

<Story name="Skeptic Selected" asChild>
	<PersonaSelector {personas} selected="2" onSelect={() => {}} />
</Story>

<Story name="Strategist Selected" asChild>
	<PersonaSelector {personas} selected="3" onSelect={() => {}} />
</Story>

<Story name="Single Persona" asChild>
	<PersonaSelector personas={[personas[0]]} selected="1" onSelect={() => {}} />
</Story>
