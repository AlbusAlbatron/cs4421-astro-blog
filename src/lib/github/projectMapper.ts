import type { GitHubRepository } from './client';

export type ImportedProject = {
	title: string;
	description: string;
	repoUrl: string;
	stack: string[];
	date: Date;
};

const DEFAULT_DESCRIPTION = 'No project description provided.';
const DEFAULT_STACK = 'GitHub project';

function getProjectStack(repository: GitHubRepository): string[] {
	const stack = [repository.language, ...repository.topics].filter(
		(value): value is string => typeof value === 'string' && value.trim().length > 0,
	);

	return [...new Set(stack)];
}

function getProjectDate(updatedAt: string): Date {
	const date = new Date(updatedAt);

	return Number.isNaN(date.valueOf()) ? new Date(0) : date;
}

export function mapRepositoryToProject(repository: GitHubRepository): ImportedProject {
	const stack = getProjectStack(repository);

	return {
		title: repository.name,
		description: repository.description?.trim() || DEFAULT_DESCRIPTION,
		repoUrl: repository.htmlUrl,
		stack: stack.length > 0 ? stack : [DEFAULT_STACK],
		date: getProjectDate(repository.updatedAt),
	};
}

export function mapRepositoriesToProjects(repositories: GitHubRepository[]): ImportedProject[] {
	return repositories.map(mapRepositoryToProject);
}