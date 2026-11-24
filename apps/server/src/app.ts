import { Hono } from 'hono';
import { BRANCH, BUILT_AT, VERSION } from './version.generated';

export const app = new Hono();

app.get('/api/health', (c) => {
  c.header('cache-control', 'no-store');
  return c.json({ ok: true, version: VERSION, branch: BRANCH, builtAt: BUILT_AT });
});

// Worker yalnızca /api/* isteklerini görür (wrangler.jsonc → run_worker_first); bilinmeyen her yol JSON 404'tür.
app.notFound((c) => c.json({ error: 'not_found' }, 404));
