<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AuthCard from './AuthCard.svelte';

	const { Story } = defineMeta({
		title: 'UI/AuthCard',
		component: AuthCard,
		tags: ['autodocs'],
		argTypes: {
			title: { control: 'text' },
			subtitle: { control: 'text' }
		}
	});
</script>

<Story name="Login" asChild>
	<AuthCard title="Welcome Back" subtitle="Sign in to The Council">
		<button class="btn btn-primary btn-lg w-full">
			Sign in with Passkey
		</button>
		{#snippet footer()}
			<p class="text-center text-sm">
				Don't have an account?
				<a href="/register" class="link link-primary">Register</a>
			</p>
		{/snippet}
	</AuthCard>
</Story>

<Story name="Register" asChild>
	<AuthCard title="Join The Council" subtitle="Create your account">
		<div class="space-y-4">
			<div class="form-control">
				<label class="label" for="name">
					<span class="label-text">Name</span>
				</label>
				<input type="text" id="name" class="input input-bordered w-full" placeholder="Your name" />
			</div>
			<div class="form-control">
				<label class="label" for="email">
					<span class="label-text">Email</span>
				</label>
				<input type="email" id="email" class="input input-bordered w-full" placeholder="you@example.com" />
			</div>
			<button class="btn btn-primary w-full">Continue</button>
		</div>
		{#snippet footer()}
			<p class="text-center text-sm">
				Already have an account?
				<a href="/login" class="link link-primary">Sign in</a>
			</p>
		{/snippet}
	</AuthCard>
</Story>

<Story name="Simple" asChild>
	<AuthCard title="Simple Card">
		<p class="text-center">Just some content without a footer.</p>
	</AuthCard>
</Story>
