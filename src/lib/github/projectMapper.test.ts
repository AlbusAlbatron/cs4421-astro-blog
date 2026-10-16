import { describe, expect, it } from 'vitest';
import type { GitHubRepository } from './client';
import { mapRepositoriesToProjects, mapRepositoryToProject } from './projectMapper';

const repository: GitHubRepository = {
	name: 'portfolio',
	description: ' A portfolio site ',
	htmlUrl: 'https://github.com/example/portfolio',
	language: 'TypeScript',
	topics: ['astro', 'portfolio'],
	visibility: 'public',
	updatedAt: '2026-10-16T12:00:00Z',
};

describe('GitHub project mapper', () => {
	it('maps complete repository data to the project schema', () => {
		expect(mapRepositoryToProject(repository)).toEqual({
			title: 'portfolio',
			description: 'A portfolio site',
			repoUrl: 'https://github.com/example/portfolio',
			stack: ['TypeScript', 'astro', 'portfolio'],
			date: new Date('2026-10-16T12:00:00Z'),
		});
	});

	it('uses fallbacks when optional repository data is missing', () => {
		const incompleteRepository: GitHubRepository = {
			...repository,
			description: null,
			language: null,
			topics: [],
		};

		expect(mapRepositoryToProject(incompleteRepository)).toEqual({
			title: 'portfolio',
			description: 'No project description provided.',
			repoUrl: 'https://github.com/example/portfolio',
			stack: ['GitHub project'],
			date: new Date('2026-10-16T12:00:00Z'),
		});
	});

	it('removes duplicate technologies and invalid dates safely', () => {
		const repositoryWithDuplicates: GitHubRepository = {
			...repository,
			language: 'astro',
			topics: ['astro', '  ', 'portfolio'],
			updatedAt: 'not-a-date',
		};

		expect(mapRepositoryToProject(repositoryWithDuplicates)).toEqual({
			title: 'portfolio',
			description: 'A portfolio site',
			repoUrl: 'https://github.com/example/portfolio',
			stack: ['astro', 'portfolio'],
			date: new Date(0),
		});
	});

	it('maps multiple repositories in input order', () => {
		const secondRepository = { ...repository, name: 'second-project' };

		expect(mapRepositoriesToProjects([repository, secondRepository]).map((project) => project.title)).toEqual([
			'portfolio',
			'second-project',
		]);
	});
});