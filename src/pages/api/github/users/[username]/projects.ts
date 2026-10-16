import type { APIRoute } from 'astro';
import { createGitHubClient, GitHubApiError, type GitHubClient } from '../../../../../lib/github/client';
import { mapRepositoriesToProjects } from '../../../../../lib/github/projectMapper';

const USERNAME_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

function isValidUsername(username: string | undefined): username is string {
	return username !== undefined && USERNAME_PATTERN.test(username);
}

export function createRepositoryImportHandler(client: GitHubClient): APIRoute {
	return async ({ params }) => {
		if (!isValidUsername(params.username)) {
			return jsonResponse({ error: 'A valid GitHub username is required.' }, 400);
		}

		try {
			const repositories = await client.listRepositories(params.username);

			return jsonResponse({ projects: mapRepositoriesToProjects(repositories) });
		} catch (error) {
			if (error instanceof GitHubApiError) {
				return jsonResponse({ error: error.message, code: error.code }, error.status);
			}

			return jsonResponse({ error: 'Unable to import GitHub repositories.' }, 502);
		}
	};
}

export const GET = createRepositoryImportHandler(createGitHubClient());