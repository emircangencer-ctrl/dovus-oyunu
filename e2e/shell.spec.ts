import { expect, test } from '@playwright/test';

test('sayfa Türkçe ve sürüm gösterir', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  await expect(page.getByTestId('surum')).toHaveText(/^Sürüm: (dev|[0-9a-f]{7}) \(.+\)$/);
});

test('sayfa başlığı oyunun adı; sekme simgesi logodan', async ({ page, request }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('SysKO');
  const href = await page.locator('link[rel="icon"]').getAttribute('href');
  expect(href).toBe('/brand/favicon.png');
  const res = await request.get(href ?? '');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('image/png');
});

test('1920×1080 pencerede tuval tam 2 kat', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  expect(await page.locator('canvas').boundingBox()).toMatchObject({ width: 1920, height: 1080 });
});

test('1366×768 pencerede tuval 1 kat ve ortalı', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  expect(await page.locator('canvas').boundingBox()).toMatchObject({ x: 203, width: 960, height: 540 });
});
