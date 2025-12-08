<script lang="ts">
	let { data } = $props();

	let editingPersona = $state<string | null>(null);
	let editName = $state('');
	let editRole = $state('');
	let editPrompt = $state('');
	let isSaving = $state(false);

	function startEditing(persona: (typeof data.personas)[0]) {
		editingPersona = persona.id;
		editName = persona.name;
		editRole = persona.role;
		editPrompt = persona.systemPrompt;
	}

	function cancelEditing() {
		editingPersona = null;
		editName = '';
		editRole = '';
		editPrompt = '';
	}

	async function savePersona(id: string) {
		isSaving = true;
		try {
			const response = await fetch(`/api/personas/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: editName,
					role: editRole,
					systemPrompt: editPrompt
				})
			});

			if (response.ok) {
				window.location.reload();
			}
		} finally {
			isSaving = false;
		}
	}
</script>

<svelte:head>
	<title>Personas - The Council</title>
</svelte:head>

<div class="p-6 max-w-4xl mx-auto">
	<div class="mb-6">
		<h1 class="text-2xl font-bold">Advisors</h1>
		<p class="text-base-content/70">Customize your council of AI advisors.</p>
	</div>

	<div class="space-y-4">
		{#each data.personas as persona (persona.id)}
			<div class="card bg-base-100 shadow-md">
				<div class="card-body">
					{#if editingPersona === persona.id}
						<!-- Edit Mode -->
						<div class="space-y-4">
							<div class="flex items-center gap-3 mb-4">
								<span class="text-4xl">{persona.avatarEmoji}</span>
								<div class="flex-1 space-y-2">
									<input
										type="text"
										class="input input-bordered w-full"
										placeholder="Name"
										bind:value={editName}
									/>
									<input
										type="text"
										class="input input-bordered w-full"
										placeholder="Role"
										bind:value={editRole}
									/>
								</div>
							</div>

							<div class="form-control">
								<label class="label" for="prompt-{persona.id}">
									<span class="label-text">System Prompt</span>
								</label>
								<textarea
									id="prompt-{persona.id}"
									class="textarea textarea-bordered h-48 font-mono text-sm"
									bind:value={editPrompt}
								></textarea>
								<p class="text-xs text-base-content/50 mt-1">
									This prompt defines the advisor's personality and behavior.
								</p>
							</div>

							<div class="flex justify-end gap-2">
								<button class="btn btn-ghost" onclick={cancelEditing}> Cancel </button>
								<button
									class="btn btn-primary"
									onclick={() => savePersona(persona.id)}
									disabled={isSaving}
								>
									{isSaving ? 'Saving...' : 'Save Changes'}
								</button>
							</div>
						</div>
					{:else}
						<!-- View Mode -->
						<div class="flex items-start gap-4">
							<div
								class="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
								style="background-color: {persona.accentColor}20"
							>
								{persona.avatarEmoji}
							</div>
							<div class="flex-1">
								<h2 class="text-xl font-semibold">{persona.name}</h2>
								<p class="text-base-content/70">{persona.role}</p>
								<div class="badge badge-sm mt-2" style="background-color: {persona.accentColor}30">
									{persona.defaultModelId}
								</div>
							</div>
							<button class="btn btn-ghost btn-sm" onclick={() => startEditing(persona)}>
								Edit
							</button>
						</div>

						<div class="mt-4 p-3 bg-base-200 rounded-lg">
							<p class="text-sm text-base-content/70 line-clamp-3 font-mono">
								{persona.systemPrompt}
							</p>
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>
