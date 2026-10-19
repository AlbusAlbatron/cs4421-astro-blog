import { Pool } from 'pg';

let pool: Pool | undefined;

export class DatabaseConfigurationError extends Error {
	constructor() {
		super('DATABASE_URL is not configured. Copy .env.example to .env and set it locally.');
		this.name = 'DatabaseConfigurationError';
	}
}

export function getDatabasePool(): Pool {
	if (!process.env.DATABASE_URL) {
		throw new DatabaseConfigurationError();
	}

	pool ??= new Pool({ connectionString: process.env.DATABASE_URL });

	return pool;
}

export async function checkDatabaseConnection(): Promise<void> {
	const database = getDatabasePool();
	const client = await database.connect();

	try {
		await client.query('SELECT 1');
	} finally {
		client.release();
	}
}