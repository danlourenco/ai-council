<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { PersonaAvatar, LoadingButton } from '$lib/components/ui';
	import { AVAILABLE_MODELS, getModelsByProvider, getModelInfo } from '$lib/models';

	let { data } = $props();

	let editingPersona = $state<string | null>(null);
	let editName = $state('');
	let editRole = $state('');
	let editPrompt = $state('');
	let editModelId = $state('');
	let isSaving = $state(false);

	// Group models by provider for the select dropdown
	const modelsByProvider = getModelsByProvider();

	function startEditing(persona: (typeof data.personas)[0]) {
		editingPersona = persona.id;
		editName = persona.name;
		editRole = persona.role;
		editPrompt = persona.systemPrompt;
		editModelId = persona.defaultModelId;
	}

	function cancelEditing() {
		editingPersona = null;
		editName = '';
		editRole = '';
		editPrompt = '';
		editModelId = '';
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
					systemPrompt: editPrompt,
					defaultModelId: editModelId
				})
			});

			if (response.ok) {
				// Refresh data without full page reload
				await invalidateAll();
				cancelEditing();
			}
		} finally {
			isSaving = false;
		}
	}
</script>

<svelte:head>
	<title>Personas - The Council</title>
</svelte:head>

<div class="p-4 sm:p-6 max-w-4xl mx-auto">
	<div class="mb-4 sm:mb-6">
		<h1 class="text-xl sm:text-2xl font-bold">Advisors</h1>
		<p class="text-sm sm:text-base text-base-content/70">Customize your council of AI advisors.</p>
	</div>

	<div class="space-y-3 sm:space-y-4">
		{#each data.personas as persona (persona.id)}
			<div class="card bg-base-100 shadow-md">
				<div class="card-body p-3 sm:p-6">
					{#if editingPersona === persona.id}
						<!-- Edit Mode -->
						<div class="space-y-3 sm:space-y-4">
							<div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
								<PersonaAvatar emoji={persona.avatarEmoji} accentColor={persona.accentColor} size="lg" />
								<div class="flex-1 space-y-2">
									<input
										type="text"
										class="input input-bordered w-full input-sm sm:input-md"
										placeholder="Name"
										bind:value={editName}
									/>
									<input
										type="text"
										class="input input-bordered w-full input-sm sm:input-md"
										placeholder="Role"
										bind:value={editRole}
									/>
								</div>
							</div>

							<div class="form-control">
								<label class="label" for="model-{persona.id}">
									<span class="label-text text-sm">AI Model</span>
								</label>
								<select
									id="model-{persona.id}"
									class="select select-bordered w-full select-sm sm:select-md"
									bind:value={editModelId}
								>
									{#each Object.entries(modelsByProvider) as [provider, models]}
										<optgroup label={provider}>
											{#each models as model}
												<option value={model.id}>{model.name}</option>
											{/each}
										</optgroup>
									{/each}
								</select>
								<p class="text-xs text-base-content/50 mt-1">
									Choose the AI model this advisor will use for responses.
								</p>
							</div>

							<div class="form-control">
								<label class="label" for="prompt-{persona.id}">
									<span class="label-text text-sm">System Prompt</span>
								</label>
								<textarea
									id="prompt-{persona.id}"
									class="textarea textarea-bordered h-36 sm:h-48 font-mono text-xs sm:text-sm"
									bind:value={editPrompt}
								></textarea>
								<p class="text-xs text-base-content/50 mt-1">
									This prompt defines the advisor's personality and behavior.
								</p>
							</div>

							<div class="flex flex-col sm:flex-row justify-end gap-2">
								<button class="btn btn-ghost btn-sm sm:btn-md" onclick={cancelEditing}>Cancel</button>
								<LoadingButton loading={isSaving} onclick={() => savePersona(persona.id)}>
									Save Changes
								</LoadingButton>
							</div>
						</div>
					{:else}
						<!-- View Mode -->
						<div class="flex items-start gap-3 sm:gap-4">
							<PersonaAvatar emoji={persona.avatarEmoji} accentColor={persona.accentColor} size="lg" />
							<div class="flex-1 min-w-0">
								<h2 class="text-lg sm:text-xl font-semibold truncate">{persona.name}</h2>
								<p class="text-sm sm:text-base text-base-content/70 truncate">{persona.role}</p>
								<div class="badge badge-sm mt-2" style="background-color: {persona.accentColor}30">
									{persona.defaultModelId}
								</div>
							</div>
							<button class="btn btn-ghost btn-sm shrink-0" onclick={() => startEditing(persona)}>
								Edit
							</button>
						</div>

						<div class="mt-3 sm:mt-4 p-2 sm:p-3 bg-base-200 rounded-lg">
							<p class="text-xs sm:text-sm text-base-content/70 line-clamp-3 font-mono">
								{persona.systemPrompt}
							</p>
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>
