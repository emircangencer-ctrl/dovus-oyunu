import { describe, expect, it } from 'vitest';
import { app } from './app';

describe('API', () => {
  it('GET /api/health sürüm bilgisini döner', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.version).toMatch(/^(dev|[0-9a-f]{7})$/);
    expect(typeof body.branch).toBe('string');
  });
  it('bilinmeyen /api yolu JSON 404 döner', async () => {
    const res = await app.request('/api/yok-boyle-bir-sey');
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(await res.json()).toEqual({ error: 'not_found' });
  });
});
