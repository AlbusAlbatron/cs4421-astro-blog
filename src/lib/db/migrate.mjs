import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://portfolio:local-dev-password@localhost:5432/portfolio';
const migrationsDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
const pool = new Pool({ connectionString: databaseUrl });

try {
	await pool.query(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`);

	const migration = await readFile(path.join(migrationsDirectory, '001_create_project_schema.sql'), 'utf8');
	const alreadyApplied = await pool.query('SELECT 1 FROM schema_migrations WHERE version = $1', ['001_create_project_schema']);

	if (alreadyApplied.rowCount === 0) {
		await pool.query('BEGIN');
		try {
			await pool.query(migration);
			await pool.query('INSERT INTO schema_migrations (version) VALUES ($1)', ['001_create_project_schema']);
			await pool.query('COMMIT');
			console.log('Applied migration 001_create_project_schema.');
		} catch (error) {
			await pool.query('ROLLBACK');
			throw error;
		}
	} else {
		console.log('No pending migrations.');
	}
} finally {
	await pool.end();
}