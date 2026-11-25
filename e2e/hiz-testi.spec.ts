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

test('iki pencere 150 ms yapay gecikmeyle: durum özetleri hep aynı', async ({ context }) => {
  const a = await context.newPage();
  const b = await context.newPage();
  await Promise.all([a.goto('/hiz-testi?gecikme=150&sure=10'), b.goto('/hiz-testi?gecikme=150&sure=10')]);
  for (const p of [a, b]) {
    await expect(p.getByTestId('hiz-senkron')).toHaveText(/^SENKRON: AYNI \(\d+ karşılaştırma\)$/, { timeout: 15_000 });
  }
  const roles = await Promise.all([a, b].map((p) => p.getByTestId('link-rol').textContent()));
  expect(roles.sort()).toEqual(['Oyuncu 1', 'Oyuncu 2']);
  for (const p of [a, b]) {
    await expect(p.getByTestId('hiz-senkron')).toHaveAttribute('data-sonuc', 'GEÇTİ', { timeout: 20_000 });
    const n = Number((await p.getByTestId('hiz-senkron').textContent())?.match(/\d+/)?.[0]);
    expect(n).toBeGreaterThan(3);
  }
});

test('tek pencerede gecikme testi ikinci pencereyi bekler, çökmez', async ({ page }) => {
  await page.goto('/hiz-testi?gecikme=150&sure=10');
  await expect(page.getByTestId('hiz-senkron')).toHaveText('İKİNCİ PENCERE BEKLENİYOR');
});
