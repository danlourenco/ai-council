import { eq, or, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { Database } from '../db';
import { projects, type NewProject, type Project } from '../db/schema';

export class ProjectService {
	constructor(private db: Database) {}

	async list(userId: string): Promise<Project[]> {
		// Get all projects that are either:
		// 1. Created by the user, OR
		// 2. Shared (isShared = true)
		return this.db.query.projects.findMany({
			where: or(eq(projects.createdBy, userId), eq(projects.isShared, true)),
			orderBy: [desc(projects.updatedAt)]
		});
	}

	async get(id: string, userId: string): Promise<Project | undefined> {
		return this.db.query.projects.findFirst({
			where: and(
				eq(projects.id, id),
				or(eq(projects.createdBy, userId), eq(projects.isShared, true))
			)
		});
	}

	async create(data: { name: string; description?: string; isShared?: boolean }, userId: string): Promise<Project> {
		const id = nanoid();
		const now = new Date();

		const newProject: NewProject = {
			id,
			name: data.name,
			description: data.description ?? null,
			isShared: data.isShared ?? true,
			createdBy: userId,
			createdAt: now,
			updatedAt: now
		};

		await this.db.insert(projects).values(newProject);

		return {
			...newProject,
			description: newProject.description ?? null
		} as Project;
	}

	async update(
		id: string,
		data: { name?: string; description?: string; isShared?: boolean },
		userId: string
	): Promise<Project | undefined> {
		// Only allow updating if user created the project
		const existing = await this.db.query.projects.findFirst({
			where: and(eq(projects.id, id), eq(projects.createdBy, userId))
		});

		if (!existing) {
			return undefined;
		}

		const updatedAt = new Date();

		await this.db
			.update(projects)
			.set({
				...(data.name !== undefined && { name: data.name }),
				...(data.description !== undefined && { description: data.description }),
				...(data.isShared !== undefined && { isShared: data.isShared }),
				updatedAt
			})
			.where(eq(projects.id, id));

		return this.get(id, userId);
	}

	async delete(id: string, userId: string): Promise<boolean> {
		// Only allow deleting if user created the project
		const existing = await this.db.query.projects.findFirst({
			where: and(eq(projects.id, id), eq(projects.createdBy, userId))
		});

		if (!existing) {
			return false;
		}

		await this.db.delete(projects).where(eq(projects.id, id));
		return true;
	}
}
