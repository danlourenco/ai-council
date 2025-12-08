<script lang="ts">
	import { signOut } from '$lib/auth-client';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { UserMenu, ConversationListItem } from '$lib/components/ui';

	let { data, children } = $props();

	async function handleSignOut() {
		await signOut();
		goto('/login');
	}

	async function handleDeleteConversation(id: string) {
		const response = await fetch(`/api/conversations/${id}`, {
			method: 'DELETE'
		});

		if (response.ok) {
			// If we're currently viewing this conversation, navigate away
			if ($page.params.id === id) {
				goto('/chat');
			}
			// Refresh the layout data to update the sidebar
			invalidateAll();
		}
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

				<ul class="list">
					{#each data.conversations as conversation (conversation.id)}
						<ConversationListItem
							id={conversation.id}
							title={conversation.title}
							href="/chat/{conversation.id}"
							active={$page.params.id === conversation.id}
							onDelete={handleDeleteConversation}
						/>
					{/each}
				</ul>
			{/if}
		</nav>

		<div class="p-4 border-t border-base-300">
			<UserMenu name={data.user?.name ?? 'User'} onSignOut={handleSignOut} />
		</div>
	</aside>

	<!-- Main content -->
	<main class="flex-1 flex flex-col">
		{@render children()}
	</main>
</div>
