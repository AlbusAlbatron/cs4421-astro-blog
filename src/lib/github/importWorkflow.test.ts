import { describe, expect, it } from 'vitest';
import { createGitHubClient } from './client';
import { createRepositoryImportHandler } from '../../pages/api/github/users/[username]/projects';

const githubRepository = {
	id: 123,
	name: 'portfolio',
	description: 'A portfolio site',
	html_url: 'https://github.com/example/portfolio',
	language: 'TypeScript',
	topics: ['astro', 'portfolio'],
	visibility: 'public',
	updated_at: '2026-10-16T12:00:00Z',
};

function githubResponse(body: unknown, init?: ResponseInit) {
	return new Response(JSON.stringify(body), init);
}

function apiRequest(username: string) {
	return { params: { username } } as unknown as Parameters<ReturnType<typeof createRepositoryImportHandler>>[0];
}

describe('GitHub import workflow', () => {
	it('returns project-shaped data from a GitHub response', async () => {
		const fetcher = async () => githubResponse([githubRepository]);
		const githubClient = createGitHubClient({ fetcher });
		const handler = createRepositoryImportHandler(githubClient);

		const response = await handler(apiRequest('octocat'));

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			projects: [
				{
					title: 'portfolio',
					description: 'A portfolio site',
					repoUrl: 'https://github.com/example/portfolio',
					stack: ['TypeScript', 'astro', 'portfolio'],
					date: '2026-10-16T12:00:00.000Z',
				},
			],
		});
	});

	it('returns a controlled error for malformed GitHub data', async () => {
		const fetcher = async () => githubResponse([{ name: 'incomplete' }]);
		const githubClient = createGitHubClient({ fetcher });
		const handler = createRepositoryImportHandler(githubClient);

		const response = await handler(apiRequest('octocat'));

		expect(response.status).toBe(502);
		expect(await response.json()).toEqual({
			error: 'GitHub returned an invalid repository response.',
			code: 'invalid_response',
		});
	});

	it('returns a controlled error when GitHub is rate limited', async () => {
		const fetcher = async () =>
			githubResponse({}, { status: 403, headers: { 'x-ratelimit-remaining': '0' } });
		const githubClient = createGitHubClient({ fetcher });
		const handler = createRepositoryImportHandler(githubClient);

		const response = await handler(apiRequest('octocat'));

		expect(response.status).toBe(429);
		expect(await response.json()).toEqual({
			error: 'GitHub rate limit exceeded. Try again later.',
			code: 'rate_limited',
		});
	});
});