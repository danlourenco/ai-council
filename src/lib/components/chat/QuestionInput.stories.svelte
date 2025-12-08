<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import QuestionInput from './QuestionInput.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Chat/QuestionInput',
		component: QuestionInput,
		tags: ['autodocs'],
		argTypes: {
			placeholder: { control: 'text' },
			disabled: { control: 'boolean' }
		},
		args: {
			onSubmit: fn()
		}
	});
</script>

<Story name="Default" asChild>
	<div class="max-w-2xl">
		<QuestionInput onSubmit={() => {}} />
	</div>
</Story>

<Story name="Custom Placeholder" asChild>
	<div class="max-w-2xl">
		<QuestionInput onSubmit={() => {}} placeholder="Ask The Sage for wisdom..." />
	</div>
</Story>

<Story name="Disabled" asChild>
	<div class="max-w-2xl">
		<QuestionInput onSubmit={() => {}} disabled={true} />
	</div>
</Story>

<Story name="In Context" asChild>
	<div class="max-w-2xl p-4 bg-base-100 border-t border-base-300">
		<QuestionInput onSubmit={() => {}} placeholder="Ask the council..." />
	</div>
</Story>
