<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AdvisorCard from './AdvisorCard.svelte';

	const { Story } = defineMeta({
		title: 'Chat/AdvisorCard',
		component: AdvisorCard,
		tags: ['autodocs'],
		argTypes: {
			content: { control: 'text' },
			isStreaming: { control: 'boolean' }
		}
	});

	const sagePersona = {
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
	};

	const skepticPersona = {
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
	};

	const strategistPersona = {
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
	};

	const sampleResponse = `Based on your situation, I'd recommend considering a few key factors:

1. **Timeline**: What's your urgency? If you need something soon, that narrows options.

2. **Budget**: Have you set a clear budget range? This helps focus the search.

3. **Priorities**: What matters most - reliability, features, or cost savings?

I'd be happy to explore any of these areas in more detail.`;

	const longResponse = `This is a much longer response that demonstrates how the card handles more substantial content.

When considering major life decisions, it's important to take a step back and consider multiple perspectives. Here are some frameworks that might help:

**The 10/10/10 Rule**
Ask yourself: How will I feel about this decision 10 minutes from now? 10 months from now? 10 years from now?

**The Regret Minimization Framework**
Imagine yourself at 80 years old, looking back. Which choice would you regret not taking?

**The Newspaper Test**
If your decision were reported in the newspaper tomorrow, would you be comfortable with how it reads?

These mental models can help cut through the noise and focus on what truly matters to you.`;
</script>

<Story name="The Sage" asChild>
	<div class="max-w-2xl">
		<AdvisorCard persona={sagePersona} content={sampleResponse} />
	</div>
</Story>

<Story name="The Skeptic" asChild>
	<div class="max-w-2xl">
		<AdvisorCard persona={skepticPersona} content="I'd push back on the assumption that you need to make this decision right now. Have you considered what happens if you wait? Sometimes the best decision is no decision." />
	</div>
</Story>

<Story name="The Strategist" asChild>
	<div class="max-w-2xl">
		<AdvisorCard persona={strategistPersona} content="Let me break this down systematically. We're looking at a classic decision matrix with three variables: cost, time, and quality. You typically can optimize for two of these at the expense of the third." />
	</div>
</Story>

<Story name="Streaming" asChild>
	<div class="max-w-2xl">
		<AdvisorCard persona={sagePersona} content="I'm thinking about your question..." isStreaming={true} />
	</div>
</Story>

<Story name="No Persona" asChild>
	<div class="max-w-2xl">
		<AdvisorCard content="This is a response without a specific persona attached." />
	</div>
</Story>

<Story name="Long Response" asChild>
	<div class="max-w-2xl">
		<AdvisorCard persona={sagePersona} content={longResponse} />
	</div>
</Story>

<Story name="All Advisors" asChild>
	<div class="max-w-4xl space-y-4">
		<AdvisorCard persona={sagePersona} content="I see wisdom in taking a balanced approach here. Consider both the practical and emotional aspects of this decision." />
		<AdvisorCard persona={skepticPersona} content="But have you really thought through the worst-case scenario? What if this doesn't work out as planned?" />
		<AdvisorCard persona={strategistPersona} content="Let's create a decision matrix. List your options as rows and your criteria as columns. Score each option 1-5 on each criterion." />
	</div>
</Story>
