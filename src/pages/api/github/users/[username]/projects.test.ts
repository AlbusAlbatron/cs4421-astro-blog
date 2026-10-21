import { describe, expect, it } from 'vitest';
import { GitHubApiError, type GitHubClient, type GitHubRepository } from '../../../../../lib/github/client';
import { createRepositoryImportHandler, createRepositoryStorageHandler } from './projects';

const repository: GitHubRepository = {
	id: 123,
	name: 'portfolio',
	description: 'A portfolio site',
	htmlUrl: 'https://github.com/example/portfolio',
	language: 'TypeScript',
	topics: ['astro'],
	visibility: 'public',
	updatedAt: '2026-10-16T12:00:00Z',
};

function requestFor(username?: string, body?: unknown) {
	return {
		params: username === undefined ? {} : { username },
		request: new Request('http://localhost', body === undefined ? undefined : {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		}),
	} as Parameters<ReturnType<typeof createRepositoryImportHandler>>[0];
}

function clientReturning(repositories: GitHubRepository[]): GitHubClient {
	return { listRepositories: async () => repositories };
}

describe('repository import API', () => {
	it('returns mapped projects for a valid username', async () => {
		const handler = createRepositoryImportHandler(clientReturning([repository]));
		const response = await handler(requestFor('octocat'));

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			projects: [
				{
					title: 'portfolio',
					description: 'A portfolio site',
					repoUrl: 'https://github.com/example/portfolio',
					stack: ['TypeScript', 'astro'],
					date: '2026-10-16T12:00:00.000Z',
				},
			],
		});
	});

	it('rejects invalid usernames before calling GitHub', async () => {
		let called = false;
		const client: GitHubClient = {
			listRepositories: async () => {
				called = true;
				return [];
			},
		};
		const handler = createRepositoryImportHandler(client);

		const response = await handler(requestFor('not a username'));

		expect(response.status).toBe(400);
		expect(called).toBe(false);
	});

	it('returns GitHub client errors to the caller', async () => {
		const client: GitHubClient = {
			listRepositories: async () => {
				throw new GitHubApiError('rate_limited', 'GitHub rate limit exceeded. Try again later.', 429);
			},
		};
		const handler = createRepositoryImportHandler(client);

		const response = await handler(requestFor('octocat'));

		expect(response.status).toBe(429);
		expect(await response.json()).toEqual({
			error: 'GitHub rate limit exceeded. Try again later.',
			code: 'rate_limited',
		});
	});

	it('returns a controlled error for unexpected failures', async () => {
		const client: GitHubClient = {
			listRepositories: async () => {
				throw new Error('unexpected failure');
			},
		};
		const handler = createRepositoryImportHandler(client);

		const response = await handler(requestFor('octocat'));

		expect(response.status).toBe(502);
		expect(await response.json()).toEqual({ error: 'Unable to import GitHub repositories.' });
	});

	it('saves selected repositories through the project repository', async () => {
		const savedProjects: unknown[] = [];
		const projectRepository = {
			saveProject: async (record: unknown) => {
				savedProjects.push(record);
				return { id: 1, ...(record as object) } as never;
			},
		};
		const handler = createRepositoryStorageHandler(clientReturning([repository]), projectRepository);

		const response = await handler(requestFor('octocat', { repoUrls: [repository.htmlUrl] }));

		expect(response.status).toBe(201);
		expect(savedProjects).toHaveLength(1);
		expect(await response.json()).toMatchObject({ projects: [{ id: 1 }] });
	});

	it('rejects an empty selection before calling GitHub', async () => {
		let called = false;
		const client: GitHubClient = {
			listRepositories: async () => {
				called = true;
				return [];
			},
		};
		const projectRepository = { saveProject: async (): Promise<never> => { throw new Error('not called'); } };
		const handler = createRepositoryStorageHandler(client, projectRepository);

		const response = await handler(requestFor('octocat', { repoUrls: [] }));

		expect(response.status).toBe(400);
		expect(called).toBe(false);
	});

	it('returns a database error when saving fails', async () => {
		const projectRepository = {
			saveProject: async () => {
				throw new Error('database unavailable');
			},
		};
		const handler = createRepositoryStorageHandler(clientReturning([repository]), projectRepository);

		const response = await handler(requestFor('octocat', { repoUrls: [repository.htmlUrl] }));

		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({ error: 'Unable to save GitHub repositories.' });
	});
});