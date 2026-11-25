import { expect, test } from '@playwright/test';

// Yayındaki bir adresi denetler: E2E_BASE_URL=<adres> pnpm e2e smoke
// İsteğe bağlı E2E_EXPECT_VERSION=<7 karakterlik commit kodu> o sürümün yayında olduğunu da doğrular.
const baseUrl = process.env.E2E_BASE_URL;
const expected = process.env.E2E_EXPECT_VERSION;

test.describe('yayın duman testi', () => {
  test.skip(!baseUrl, 'E2E_BASE_URL verilmedi');

  test('sayfadaki sürüm /api/health ile aynı', async ({ page, request }) => {
    const health = await (await request.get('/api/health')).json();
    await page.goto('/');
    // Sürüm satırı /api/health cevabı gelince dolar; toHaveText o ana kadar bekler.
    await expect(page.getByTestId('surum')).toHaveText(`Sürüm: ${health.version} (${health.branch})`);
    if (expected) expect(health.version).toBe(expected);
  });
});
