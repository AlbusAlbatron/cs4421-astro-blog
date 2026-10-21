const GITHUB_API_URL = 'https://api.github.com';

export type GitHubRepository = {
	id: number;
	name: string;
	description: string | null;
	htmlUrl: string;
	language: string | null;
	topics: string[];
	visibility: string;
	updatedAt: string;
};

export type GitHubApiErrorCode =
	| 'not_found'
	| 'rate_limited'
	| 'invalid_response'
	| 'request_failed';

export class GitHubApiError extends Error {
	readonly code: GitHubApiErrorCode;
	readonly status: number;

	constructor(code: GitHubApiErrorCode, message: string, status: number) {
		super(message);
		this.name = 'GitHubApiError';
		this.code = code;
		this.status = status;
	}
}

type GitHubClientOptions = {
	baseUrl?: string;
	fetcher?: typeof fetch;
	token?: string;
};

type GitHubRepositoryResponse = {
	id: number;
	name: string;
	description: string | null;
	html_url: string;
	language: string | null;
	topics: string[];
	visibility: string;
	updated_at: string;
};

function isRepositoryResponse(value: unknown): value is GitHubRepositoryResponse {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	const repository = value as Record<string, unknown>;

	return (
		typeof repository.id === 'number' &&
		typeof repository.name === 'string' &&
		(repository.description === null || typeof repository.description === 'string') &&
		typeof repository.html_url === 'string' &&
		(repository.language === null || typeof repository.language === 'string') &&
		Array.isArray(repository.topics) &&
		repository.topics.every((topic) => typeof topic === 'string') &&
		typeof repository.visibility === 'string' &&
		typeof repository.updated_at === 'string'
	);
}

function getErrorForResponse(response: Response): GitHubApiError {
	if (response.status === 404) {
		return new GitHubApiError('not_found', 'GitHub user was not found.', 404);
	}

	if (response.status === 429 || (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0')) {
		return new GitHubApiError('rate_limited', 'GitHub rate limit exceeded. Try again later.', 429);
	}

	return new GitHubApiError('request_failed', 'GitHub repository request failed.', response.status);
}

export function createGitHubClient(options: GitHubClientOptions = {}) {
	const baseUrl = options.baseUrl ?? GITHUB_API_URL;
	const fetcher = options.fetcher ?? fetch;

	return {
		async listRepositories(username: string): Promise<GitHubRepository[]> {
			let response: Response;

			try {
				response = await fetcher(
					`${baseUrl}/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`,
					{
						headers: {
							Accept: 'application/vnd.github+json',
							'X-GitHub-Api-Version': '2022-11-28',
							...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
						},
					},
				);
			} catch {
				throw new GitHubApiError('request_failed', 'Unable to reach GitHub.', 503);
			}

			if (!response.ok) {
				throw getErrorForResponse(response);
			}

			let payload: unknown;

			try {
				payload = await response.json();
			} catch {
				throw new GitHubApiError('invalid_response', 'GitHub returned invalid JSON.', 502);
			}

			if (!Array.isArray(payload) || !payload.every(isRepositoryResponse)) {
				throw new GitHubApiError('invalid_response', 'GitHub returned an invalid repository response.', 502);
			}

			return payload.map((repository) => ({
				id: repository.id,
				name: repository.name,
				description: repository.description,
				htmlUrl: repository.html_url,
				language: repository.language,
				topics: repository.topics,
				visibility: repository.visibility,
				updatedAt: repository.updated_at,
			}));
		},
	};
}

export type GitHubClient = ReturnType<typeof createGitHubClient>;