import type { QueryResult, QueryResultRow } from 'pg';
import type { ImportedProject } from '../github/projectMapper';

type DatabaseClient = {
	query: <Result extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]) => Promise<QueryResult<Result>>;
};

export type ProjectRecord = {
	githubRepoId: number;
	githubOwner: string;
	repositoryName: string;
	project: ImportedProject;
};

export type PersistedProject = ProjectRecord & {
	id: number;
	published: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export type ProjectOverrides = {
	title?: string;
	description?: string;
	stack?: string[];
	published?: boolean;
};

type ProjectRow = {
	id: number;
	github_repo_id: string | number;
	github_owner: string;
	repository_name: string;
	title: string;
	description: string;
	repository_url: string;
	technologies: string[];
	last_github_update: Date;
	published: boolean;
	created_at: Date;
	updated_at: Date;
	override_title?: string | null;
	override_description?: string | null;
	override_technologies?: string[] | null;
	override_published?: boolean | null;
};

const PROJECT_COLUMNS = `
	id, github_repo_id, github_owner, repository_name, title, description,
	repository_url, technologies, last_github_update, published, created_at, updated_at
`;

function rowToProject(row: ProjectRow): PersistedProject {
	return {
		githubRepoId: Number(row.github_repo_id),
		githubOwner: row.github_owner,
		repositoryName: row.repository_name,
		project: {
			title: row.override_title ?? row.title,
			description: row.override_description ?? row.description,
			repoUrl: row.repository_url,
			stack: row.override_technologies ?? row.technologies,
			date: new Date(row.last_github_update),
		},
		id: Number(row.id),
		published: row.override_published ?? row.published,
		createdAt: new Date(row.created_at),
		updatedAt: new Date(row.updated_at),
	};
}

export function createProjectRepository(database: DatabaseClient) {
	return {
		async saveProject(record: ProjectRecord): Promise<PersistedProject> {
			const result = await database.query<ProjectRow>(
				`INSERT INTO projects (
					github_repo_id, github_owner, repository_name, title, description,
					repository_url, technologies, last_github_update
				) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
				ON CONFLICT (github_repo_id) DO UPDATE SET
					github_owner = EXCLUDED.github_owner,
					repository_name = EXCLUDED.repository_name,
					title = EXCLUDED.title,
					description = EXCLUDED.description,
					repository_url = EXCLUDED.repository_url,
					technologies = EXCLUDED.technologies,
					last_github_update = EXCLUDED.last_github_update,
					updated_at = NOW()
				RETURNING ${PROJECT_COLUMNS}`,
				[
					record.githubRepoId,
					record.githubOwner,
				record.repositoryName,
					record.project.title,
					record.project.description,
					record.project.repoUrl,
					JSON.stringify(record.project.stack),
					record.project.date,
				],
			);

			return rowToProject(result.rows[0]);
		},

		async findProjectsByOwner(owner: string): Promise<PersistedProject[]> {
			const result = await database.query<ProjectRow>(
				`SELECT ${PROJECT_COLUMNS}, overrides.title AS override_title,
					overrides.description AS override_description,
					overrides.technologies AS override_technologies,
					overrides.published AS override_published
				 FROM projects
				 LEFT JOIN project_overrides AS overrides ON overrides.project_id = projects.id
				 WHERE github_owner = $1 ORDER BY last_github_update DESC`,
				[owner],
			);

			return result.rows.map(rowToProject);
		},

		async findProjectByRepositoryId(repositoryId: number): Promise<PersistedProject | null> {
			const result = await database.query<ProjectRow>(
				`SELECT ${PROJECT_COLUMNS}, overrides.title AS override_title,
					overrides.description AS override_description,
					overrides.technologies AS override_technologies,
					overrides.published AS override_published
				 FROM projects
				 LEFT JOIN project_overrides AS overrides ON overrides.project_id = projects.id
				 WHERE github_repo_id = $1`,
				[repositoryId],
			);

			return result.rows[0] ? rowToProject(result.rows[0]) : null;
		},

		async saveProjectOverrides(projectId: number, overrides: ProjectOverrides): Promise<void> {
			await database.query(
				`INSERT INTO project_overrides (project_id, title, description, technologies, published)
				 VALUES ($1, $2, $3, $4::jsonb, $5)
				 ON CONFLICT (project_id) DO UPDATE SET
					title = COALESCE(EXCLUDED.title, project_overrides.title),
					description = COALESCE(EXCLUDED.description, project_overrides.description),
					technologies = COALESCE(EXCLUDED.technologies, project_overrides.technologies),
					published = COALESCE(EXCLUDED.published, project_overrides.published),
					updated_at = NOW()`,
				[
					projectId,
					overrides.title ?? null,
					overrides.description ?? null,
					overrides.stack === undefined ? null : JSON.stringify(overrides.stack),
					overrides.published ?? null,
				],
			);
		},
	};
}