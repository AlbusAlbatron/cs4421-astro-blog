import { describe, expect, it } from 'vitest';
import type { QueryResult } from 'pg';
import { createProjectRepository, type ProjectRecord } from './projects';

const project: ProjectRecord = {
	githubRepoId: 123,
	githubOwner: 'octocat',
	repositoryName: 'portfolio',
	project: {
		title: 'portfolio',
		description: 'A portfolio site',
		repoUrl: 'https://github.com/octocat/portfolio',
		stack: ['TypeScript', 'Astro'],
		date: new Date('2026-10-16T12:00:00Z'),
	},
};

const row = {
	id: 1,
	github_repo_id: '123',
	github_owner: 'octocat',
	repository_name: 'portfolio',
	title: 'portfolio',
	description: 'A portfolio site',
	repository_url: 'https://github.com/octocat/portfolio',
	technologies: ['TypeScript', 'Astro'],
	last_github_update: new Date('2026-10-16T12:00:00Z'),
	published: false,
	created_at: new Date('2026-10-16T12:00:00Z'),
	updated_at: new Date('2026-10-16T12:00:00Z'),
};

function databaseReturning(...rows: (typeof row & {
	override_title?: string | null;
	override_description?: string | null;
	override_technologies?: string[] | null;
	override_published?: boolean | null;
})[]) {
	const calls: { text: string; values?: unknown[] }[] = [];
	return {
		calls,
		database: {
			query: async <Result extends object>(text: string, values?: unknown[]) => {
				calls.push({ text, values });
				return { rows } as QueryResult<Result>;
			},
		},
	};
}

describe('project repository', () => {
	it('saves a project with parameterized values', async () => {
		const { database, calls } = databaseReturning(row);
		const repository = createProjectRepository(database);

		const saved = await repository.saveProject(project);

		expect(saved.project.title).toBe('portfolio');
		expect(calls[0].text).toContain('ON CONFLICT (github_repo_id) DO UPDATE');
		expect(calls[0].text).not.toContain(project.project.description);
		expect(calls[0].values).toEqual([
			123,
			'octocat',
			'portfolio',
			'portfolio',
			'A portfolio site',
			'https://github.com/octocat/portfolio',
			'["TypeScript","Astro"]',
			new Date('2026-10-16T12:00:00Z'),
		]);
	});

	it('retrieves projects by GitHub owner', async () => {
		const { database, calls } = databaseReturning(row);
		const repository = createProjectRepository(database);

		await expect(repository.findProjectsByOwner('octocat')).resolves.toHaveLength(1);
		expect(calls[0].values).toEqual(['octocat']);
	});

	it('returns null when a repository is not found', async () => {
		const { database } = databaseReturning();
		const repository = createProjectRepository(database);

		await expect(repository.findProjectByRepositoryId(999)).resolves.toBeNull();
	});

	it('saves overrides without changing imported project fields', async () => {
		const { database, calls } = databaseReturning(row);
		const repository = createProjectRepository(database);

		await repository.saveProjectOverrides(1, {
			title: 'My portfolio project',
			description: 'A custom description',
			stack: ['C', 'Win32'],
			published: true,
		});

		expect(calls[0].text).toContain('INSERT INTO project_overrides');
		expect(calls[0].values).toEqual([1, 'My portfolio project', 'A custom description', '["C","Win32"]', true]);
	});

	it('uses overrides when reading a project', async () => {
		const { database } = databaseReturning({
			...row,
			override_title: 'My portfolio project',
			override_description: 'A custom description',
			override_technologies: ['C', 'Win32'],
			override_published: true,
		});
		const repository = createProjectRepository(database);

		await expect(repository.findProjectByRepositoryId(123)).resolves.toMatchObject({
			project: {
				title: 'My portfolio project',
				description: 'A custom description',
				stack: ['C', 'Win32'],
			},
			published: true,
		});
	});
});