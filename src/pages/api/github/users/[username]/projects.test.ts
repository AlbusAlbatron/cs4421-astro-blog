import { describe, expect, it } from 'vitest';
import { GitHubApiError, type GitHubClient, type GitHubRepository } from '../../../../../lib/github/client';
import { createRepositoryImportHandler } from './projects';

const repository: GitHubRepository = {
	name: 'portfolio',
	description: 'A portfolio site',
	htmlUrl: 'https://github.com/example/portfolio',
	language: 'TypeScript',
	topics: ['astro'],
	visibility: 'public',
	updatedAt: '2026-10-16T12:00:00Z',
};

function requestFor(username?: string) {
	return { params: username === undefined ? {} : { username } } as Parameters<ReturnType<typeof createRepositoryImportHandler>>[0];
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
});