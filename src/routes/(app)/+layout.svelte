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

	function closeSidebar() {
		const drawer = document.getElementById('app-drawer') as HTMLInputElement;
		if (drawer) {
			drawer.checked = false;
		}
	}
</script>

<div class="drawer lg:drawer-open">
	<input id="app-drawer" type="checkbox" class="drawer-toggle" />

	<!-- Main content -->
	<div class="drawer-content flex flex-col min-h-screen bg-base-200">
		<!-- Mobile header with hamburger -->
		<header class="lg:hidden sticky top-0 z-30 flex items-center gap-2 bg-base-100 px-4 py-3 border-b border-base-300">
			<label for="app-drawer" class="btn btn-square btn-ghost">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					class="inline-block h-6 w-6 stroke-current"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 6h16M4 12h16M4 18h16"
					></path>
				</svg>
			</label>
			<h1 class="text-lg font-bold">The Council</h1>
		</header>

		<main class="flex-1 flex flex-col">
			{@render children()}
		</main>
	</div>

	<!-- Sidebar -->
	<div class="drawer-side z-40">
		<label for="app-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
		<aside class="w-64 min-h-full bg-base-100 border-r border-base-300 flex flex-col">
			<div class="p-4 border-b border-base-300">
				<h1 class="text-xl font-bold">The Council</h1>
			</div>

			<nav class="flex-1 p-4 space-y-2 overflow-y-auto">
				<a
					href="/chat"
					class="btn btn-primary btn-block justify-start gap-2"
					onclick={closeSidebar}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
					New Chat
				</a>

				<a
					href="/personas"
					class="btn btn-ghost btn-block justify-start gap-2"
					onclick={closeSidebar}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
						/>
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
								onclick={closeSidebar}
							/>
						{/each}
					</ul>
				{/if}
			</nav>

			<div class="p-4 border-t border-base-300">
				<UserMenu name={data.user?.name ?? 'User'} onSignOut={handleSignOut} />
			</div>
		</aside>
	</div>
</div>
