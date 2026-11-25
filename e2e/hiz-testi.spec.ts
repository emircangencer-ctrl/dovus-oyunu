import { expect, test } from '@playwright/test';

test('hız testi: başlatılır, süresi dolunca sonuç verir; simülasyon saniyede 60 adım', async ({ page }) => {
  await page.goto('/hiz-testi?sure=5');
  const sonuc = page.getByTestId('hiz-sonuc');
  await expect(sonuc).toHaveText('HAZIR');
  await page.keyboard.press('Enter');
  await expect(sonuc).toHaveText('SÜRÜYOR');
  await expect(sonuc).toHaveText(/^(GEÇTİ|KALDI)$/, { timeout: 15_000 });
  const sim = Number(await page.getByTestId('hiz-sim').textContent());
  expect(sim).toBeGreaterThan(55);
  expect(sim).toBeLessThan(65);
  await expect(page.getByTestId('surum')).toHaveText(/^Sürüm: /);
});
