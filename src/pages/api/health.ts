import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({ status: 'error' }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
