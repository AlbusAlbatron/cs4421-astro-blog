import type { APIRoute } from 'astro';
import { createGitHubClient, GitHubApiError, type GitHubClient } from '../../../../../lib/github/client';
import { mapRepositoriesToProjects } from '../../../../../lib/github/projectMapper';
import { getDatabasePool } from '../../../../../lib/db/database';
import { createProjectRepository, type PersistedProject } from '../../../../../lib/db/projects';

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

type ProjectRepository = {
	saveProject: (record: {
		githubRepoId: number;
		githubOwner: string;
		repositoryName: string;
		project: ReturnType<typeof mapRepositoriesToProjects>[number];
	}) => Promise<PersistedProject>;
};

export function createRepositoryStorageHandler(client: GitHubClient, repository: ProjectRepository): APIRoute {
	return async ({ params, request }) => {
		const username = params.username;

		if (!isValidUsername(username)) {
			return jsonResponse({ error: 'A valid GitHub username is required.' }, 400);
		}

		let body: unknown;
		try {
			body = await request.json();
		} catch {
			return jsonResponse({ error: 'Request body must be valid JSON.' }, 400);
		}

		const repoUrls =
			typeof body === 'object' && body !== null && Array.isArray((body as { repoUrls?: unknown }).repoUrls)
				? (body as { repoUrls: unknown[] }).repoUrls.filter((url): url is string => typeof url === 'string')
				: [];

		if (repoUrls.length === 0) {
			return jsonResponse({ error: 'Select at least one repository to import.' }, 400);
		}

		try {
			const repositories = await client.listRepositories(username);
			const selectedRepositories = repositories.filter((repository) => repoUrls.includes(repository.htmlUrl));

			if (selectedRepositories.length === 0) {
				return jsonResponse({ error: 'None of the selected repositories were found.' }, 404);
			}

			const projects = mapRepositoriesToProjects(selectedRepositories);
			const savedProjects = await Promise.all(
				selectedRepositories.map((sourceRepository, index) =>
					repository.saveProject({
						githubRepoId: sourceRepository.id,
						githubOwner: username,
						repositoryName: sourceRepository.name,
						project: projects[index],
					}),
				),
			);

			return jsonResponse({ projects: savedProjects }, 201);
		} catch (error) {
			if (error instanceof GitHubApiError) {
				return jsonResponse({ error: error.message, code: error.code }, error.status);
			}

			return jsonResponse({ error: 'Unable to save GitHub repositories.' }, 503);
		}
	};
}

export const POST: APIRoute = async (context) => {
	const repository = createProjectRepository(getDatabasePool());
	return createRepositoryStorageHandler(createGitHubClient(), repository)(context);
};