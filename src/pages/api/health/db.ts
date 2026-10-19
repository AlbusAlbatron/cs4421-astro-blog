import type { APIRoute } from 'astro';
import { checkDatabaseConnection, DatabaseConfigurationError } from '../../../lib/db/database';

export const GET: APIRoute = async () => {
	try {
		await checkDatabaseConnection();

		return new Response(JSON.stringify({ status: 'ok' }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		const message = error instanceof DatabaseConfigurationError ? error.message : 'Database connection failed.';

		return new Response(JSON.stringify({ status: 'error', error: message }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};