import { expect, test } from '@playwright/test';

test('derin sayfa yolu oyunu açar (SPA)', async ({ page }) => {
  const res = await page.goto('/turnuva/123');
  expect(res?.status()).toBe(200);
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByTestId('surum')).toHaveText(/^Sürüm: (dev|[0-9a-f]{7}) \(.+\)$/);
});

test('bilinmeyen /api yolu HTML değil JSON 404 döner', async ({ request }) => {
  const res = await request.get('/api/yok');
  expect(res.status()).toBe(404);
  expect(res.headers()['content-type']).toContain('application/json');
  expect(await res.json()).toEqual({ error: 'not_found' });
});

test('/api/health önbelleğe alınmaz', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
  expect(res.headers()['cache-control']).toBe('no-store');
});

test('tarayıcıda doğrudan açılan bilinmeyen /api yolu da JSON 404 döner', async ({ page }) => {
  const res = await page.goto('/api/yok');
  expect(res?.status()).toBe(404);
  expect(res?.headers()['content-type']).toContain('application/json');
});
