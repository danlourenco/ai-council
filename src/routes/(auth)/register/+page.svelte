<script lang="ts">
	import { goto } from '$app/navigation';
	import { signUp, registerPasskey } from '$lib/auth-client';

	let name = $state('');
	let email = $state('');
	let error = $state('');
	let loading = $state(false);
	let step = $state<'info' | 'passkey'>('info');

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		error = '';

		try {
			// First, create the account
			const result = await signUp.email({
				email,
				name,
				password: crypto.randomUUID() // Temporary password, we'll use passkey
			});

			console.log('Signup result:', result);

			if (result.error) {
				console.error('Signup error:', result.error);
				error = result.error.message || result.error.statusText || JSON.stringify(result.error);
				loading = false;
				return;
			}

			// Move to passkey registration step
			step = 'passkey';
			loading = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'An unexpected error occurred';
			loading = false;
		}
	}

	async function handlePasskeyRegistration() {
		loading = true;
		error = '';

		try {
			const result = await registerPasskey({ name: `${name}'s Passkey` });
			console.log('Passkey registration result:', result);

			if (result.error) {
				error = result.error.message || 'Failed to register passkey';
			} else {
				// Use window.location for a hard redirect to ensure session is picked up
				window.location.href = '/chat';
			}
		} catch (e) {
			console.error('Passkey registration error:', e);
			error = e instanceof Error ? e.message : 'An unexpected error occurred';
		} finally {
			loading = false;
		}
	}

	function skipPasskey() {
		// Allow users to skip passkey setup and go to the app
		// They can add a passkey later from settings
		goto('/chat');
	}
</script>

<svelte:head>
	<title>Register - The Council</title>
</svelte:head>

<div class="min-h-screen bg-base-200 flex items-center justify-center p-4">
	<div class="card bg-base-100 shadow-xl w-full max-w-md">
		<div class="card-body">
			<h1 class="text-3xl font-bold text-center mb-2">Join The Council</h1>
			<p class="text-center text-base-content/70 mb-6">
				{#if step === 'info'}
					Create your account
				{:else}
					Set up your passkey
				{/if}
			</p>

			{#if error}
				<div class="alert alert-error mb-4">
					<span>{error}</span>
				</div>
			{/if}

			{#if step === 'info'}
				<form onsubmit={handleSubmit}>
					<div class="form-control mb-4">
						<label class="label" for="name">
							<span class="label-text">Name</span>
						</label>
						<input
							type="text"
							id="name"
							bind:value={name}
							class="input input-bordered w-full"
							placeholder="Your name"
							required
						/>
					</div>

					<div class="form-control mb-6">
						<label class="label" for="email">
							<span class="label-text">Email</span>
						</label>
						<input
							type="email"
							id="email"
							bind:value={email}
							class="input input-bordered w-full"
							placeholder="you@example.com"
							required
						/>
					</div>

					<button type="submit" class="btn btn-primary w-full" disabled={loading}>
						{#if loading}
							<span class="loading loading-spinner"></span>
						{:else}
							Continue
						{/if}
					</button>
				</form>
			{:else}
				<div class="text-center">
					<div class="mb-6">
						<div
							class="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-10 w-10 text-primary"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
								/>
							</svg>
						</div>
						<p class="text-base-content/70">
							Passkeys are more secure than passwords. You'll use your device's biometrics or PIN to
							sign in.
						</p>
					</div>

					<button
						class="btn btn-primary btn-lg w-full"
						onclick={handlePasskeyRegistration}
						disabled={loading}
					>
						{#if loading}
							<span class="loading loading-spinner"></span>
						{:else}
							Register Passkey
						{/if}
					</button>

					<button class="btn btn-ghost btn-sm w-full mt-2" onclick={skipPasskey} disabled={loading}>
						Skip for now
					</button>
				</div>
			{/if}

			<div class="divider">or</div>

			<p class="text-center text-sm">
				Already have an account?
				<a href="/login" class="link link-primary">Sign in</a>
			</p>
		</div>
	</div>
</div>
