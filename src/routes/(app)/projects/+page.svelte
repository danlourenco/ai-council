<script lang="ts">
	let { data } = $props();
	let showNewProjectForm = $state(false);
	let newProjectName = $state('');
	let newProjectDescription = $state('');
	let isSubmitting = $state(false);

	async function createProject() {
		if (!newProjectName.trim()) return;
		isSubmitting = true;

		try {
			const response = await fetch('/api/projects', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newProjectName.trim(),
					description: newProjectDescription.trim() || undefined
				})
			});

			if (response.ok) {
				// Reload the page to get updated project list
				window.location.reload();
			}
		} finally {
			isSubmitting = false;
		}
	}

	async function deleteProject(id: string) {
		if (!confirm('Are you sure you want to delete this project?')) return;

		const response = await fetch(`/api/projects/${id}`, {
			method: 'DELETE'
		});

		if (response.ok) {
			window.location.reload();
		}
	}
</script>

<svelte:head>
	<title>Projects - The Council</title>
</svelte:head>

<div class="p-6 max-w-4xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-2xl font-bold">Projects</h1>
		<button class="btn btn-primary" onclick={() => (showNewProjectForm = true)}>
			New Project
		</button>
	</div>

	{#if showNewProjectForm}
		<div class="card bg-base-100 shadow-md mb-6">
			<div class="card-body">
				<h2 class="card-title">Create New Project</h2>
				<div class="form-control">
					<label class="label" for="project-name">
						<span class="label-text">Project Name</span>
					</label>
					<input
						id="project-name"
						type="text"
						class="input input-bordered"
						placeholder="e.g., Home Purchase Decision"
						bind:value={newProjectName}
					/>
				</div>
				<div class="form-control">
					<label class="label" for="project-description">
						<span class="label-text">Description (optional)</span>
					</label>
					<textarea
						id="project-description"
						class="textarea textarea-bordered"
						placeholder="Brief description of what you're deciding..."
						bind:value={newProjectDescription}
					></textarea>
				</div>
				<div class="card-actions justify-end mt-4">
					<button
						class="btn btn-ghost"
						onclick={() => {
							showNewProjectForm = false;
							newProjectName = '';
							newProjectDescription = '';
						}}
					>
						Cancel
					</button>
					<button
						class="btn btn-primary"
						onclick={createProject}
						disabled={isSubmitting || !newProjectName.trim()}
					>
						{isSubmitting ? 'Creating...' : 'Create Project'}
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if data.projects.length === 0}
		<div class="text-center py-12">
			<div class="text-6xl mb-4">📁</div>
			<h3 class="text-xl font-semibold mb-2">No projects yet</h3>
			<p class="text-base-content/60 mb-4">Create a project to organize your conversations.</p>
			<button class="btn btn-primary" onclick={() => (showNewProjectForm = true)}>
				Create Your First Project
			</button>
		</div>
	{:else}
		<div class="grid gap-4 md:grid-cols-2">
			{#each data.projects as project (project.id)}
				<div class="card bg-base-100 shadow-md">
					<div class="card-body">
						<h2 class="card-title">{project.name}</h2>
						{#if project.description}
							<p class="text-base-content/70">{project.description}</p>
						{/if}
						<div class="card-actions justify-end mt-2">
							<button
								class="btn btn-ghost btn-sm text-error"
								onclick={() => deleteProject(project.id)}
							>
								Delete
							</button>
							<a href="/chat?project={project.id}" class="btn btn-primary btn-sm"> Open Chat </a>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
