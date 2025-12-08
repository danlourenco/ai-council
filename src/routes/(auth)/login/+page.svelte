<script lang="ts">
	import { goto } from '$app/navigation';
	import { authenticateWithPasskey } from '$lib/auth-client';

	let email = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handlePasskeyLogin() {
		loading = true;
		error = '';

		try {
			const result = await authenticateWithPasskey();
			if (result.error) {
				error = result.error.message || 'Failed to authenticate with passkey';
			} else {
				goto('/');
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'An unexpected error occurred';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Login - The Council</title>
</svelte:head>

<div class="min-h-screen bg-base-200 flex items-center justify-center p-4">
	<div class="card bg-base-100 shadow-xl w-full max-w-md">
		<div class="card-body">
			<h1 class="text-3xl font-bold text-center mb-2">Welcome Back</h1>
			<p class="text-center text-base-content/70 mb-6">Sign in to The Council</p>

			{#if error}
				<div class="alert alert-error mb-4">
					<span>{error}</span>
				</div>
			{/if}

			<button
				class="btn btn-primary btn-lg w-full"
				onclick={handlePasskeyLogin}
				disabled={loading}
			>
				{#if loading}
					<span class="loading loading-spinner"></span>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6 mr-2"
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
					Sign in with Passkey
				{/if}
			</button>

			<div class="divider">or</div>

			<p class="text-center text-sm">
				Don't have an account?
				<a href="/register" class="link link-primary">Register</a>
			</p>
		</div>
	</div>
</div>
