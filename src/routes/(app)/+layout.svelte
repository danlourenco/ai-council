<script lang="ts">
	import { signOut } from '$lib/auth-client';
	import { goto } from '$app/navigation';

	let { data, children } = $props();

	async function handleSignOut() {
		await signOut();
		goto('/login');
	}

	// Format date for display
	function formatDate(date: Date): string {
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (days === 0) return 'Today';
		if (days === 1) return 'Yesterday';
		if (days < 7) return `${days} days ago`;
		return date.toLocaleDateString();
	}
</script>

<div class="min-h-screen bg-base-200 flex">
	<!-- Sidebar -->
	<aside class="w-64 bg-base-100 border-r border-base-300 flex flex-col">
		<div class="p-4 border-b border-base-300">
			<h1 class="text-xl font-bold">The Council</h1>
		</div>

		<nav class="flex-1 p-4 space-y-2 overflow-y-auto">
			<a href="/chat" class="btn btn-primary btn-block justify-start gap-2">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				New Chat
			</a>

			<a href="/personas" class="btn btn-ghost btn-block justify-start gap-2">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
				</svg>
				Personas
			</a>

			{#if data.conversations.length > 0}
				<div class="divider text-xs">Recent Chats</div>

				{#each data.conversations as conversation (conversation.id)}
					<a
						href="/chat/{conversation.id}"
						class="btn btn-ghost btn-sm btn-block justify-start text-left"
						title={conversation.title}
					>
						<span class="truncate flex-1">{conversation.title}</span>
					</a>
				{/each}
			{/if}
		</nav>

		<div class="p-4 border-t border-base-300">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<div class="avatar placeholder">
						<div class="bg-primary text-primary-content rounded-full w-8">
							<span class="text-xs">{data.user?.name?.charAt(0) ?? 'U'}</span>
						</div>
					</div>
					<span class="text-sm font-medium">{data.user?.name}</span>
				</div>
				<button class="btn btn-ghost btn-sm btn-square" onclick={handleSignOut} title="Sign out">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
					</svg>
				</button>
			</div>
		</div>
	</aside>

	<!-- Main content -->
	<main class="flex-1 flex flex-col">
		{@render children()}
	</main>
</div>
