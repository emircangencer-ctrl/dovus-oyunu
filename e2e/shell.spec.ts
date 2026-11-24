import { expect, test } from '@playwright/test';

test('sayfa Türkçe ve sürüm gösterir', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  await expect(page.getByTestId('surum')).toHaveText(/^Sürüm: (dev|[0-9a-f]{7}) \(.+\)$/);
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
