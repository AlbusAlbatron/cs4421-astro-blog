import { describe, expect, it } from 'vitest';
import { createGitHubClient } from './client';

const repository = {
	name: 'portfolio',
	description: 'A portfolio site',
	html_url: 'https://github.com/example/portfolio',
	language: 'TypeScript',
	topics: ['astro', 'portfolio'],
	visibility: 'public',
	updated_at: '2026-10-16T12:00:00Z',
};

function response(body: unknown, init?: ResponseInit) {
	return new Response(JSON.stringify(body), init);
}

describe('GitHub repository client', () => {
	it('returns the repository fields needed by the project importer', async () => {
		const fetcher = async () => response([repository]);
		const client = createGitHubClient({ fetcher });

		await expect(client.listRepositories('octocat')).resolves.toEqual([
			{
				name: 'portfolio',
				description: 'A portfolio site',
				htmlUrl: 'https://github.com/example/portfolio',
				language: 'TypeScript',
				topics: ['astro', 'portfolio'],
				visibility: 'public',
				updatedAt: '2026-10-16T12:00:00Z',
			},
		]);
	});

	it('sends the username and GitHub API headers', async () => {
		let request: RequestInfo | URL | undefined;
		let requestInit: RequestInit | undefined;
		const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
			request = input;
			requestInit = init;
			return response([]);
		};
		const client = createGitHubClient({ fetcher, token: 'test-token' });

		await client.listRepositories('user/name');

		expect(request).toBe('https://api.github.com/users/user%2Fname/repos?per_page=100&sort=updated');
		expect(requestInit?.headers).toEqual({
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			Authorization: 'Bearer test-token',
		});
	});

	it('reports an unknown user', async () => {
		const fetcher = async () => response({}, { status: 404 });
		const client = createGitHubClient({ fetcher });

		await expect(client.listRepositories('missing')).rejects.toMatchObject({
			code: 'not_found',
			status: 404,
		});
	});

	it('reports rate limiting', async () => {
		const fetcher = async () =>
			response({}, { status: 403, headers: { 'x-ratelimit-remaining': '0' } });
		const client = createGitHubClient({ fetcher });

		await expect(client.listRepositories('octocat')).rejects.toMatchObject({
			code: 'rate_limited',
			status: 429,
		});
	});

	it('reports network failures', async () => {
		const fetcher = async () => {
			throw new Error('network unavailable');
		};
		const client = createGitHubClient({ fetcher });

		await expect(client.listRepositories('octocat')).rejects.toMatchObject({
			code: 'request_failed',
			status: 503,
		});
	});

	it('rejects malformed repository data', async () => {
		const fetcher = async () => response([{ name: 'incomplete' }]);
		const client = createGitHubClient({ fetcher });

		await expect(client.listRepositories('octocat')).rejects.toMatchObject({
			code: 'invalid_response',
			status: 502,
		});
	});
});