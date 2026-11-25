/// <reference lib="dom" />
import { expect, test } from '@playwright/test';

// Gezinme testleri tam ekran davranışından bağımsız olsun: gerçek tam ekranda tarayıcı Esc'yi kendisi kullanabilir
// (Firefox). Tam ekranın kendisi aşağıdaki iki testte ayrıca denetlenir.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Element.prototype.requestFullscreen = () => Promise.resolve();
  });
});

test('açılışta başlık ekranı ve logo görünür', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('baslik')).toBeVisible();
  await expect(page.getByTestId('bir-tusa-bas')).toHaveText('BİR TUŞA BAS');
  await expect(page.getByTestId('baslik').getByRole('img', { name: 'SysKO' })).toBeVisible();
  await expect(page.getByTestId('ana-menu')).toBeHidden();
});

test('Enter ana menüyü açar; oklarla gezilir, seçince YAKINDA çıkar, Esc başlığa döner', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Enter');
  const menu = page.getByTestId('ana-menu');
  await expect(menu).toBeVisible();
  const items = page.getByTestId('menu-secenek');
  await expect(items).toHaveCount(8);
  await expect(items.nth(0)).toHaveAttribute('aria-current', 'true');

  await page.keyboard.press('ArrowDown');
  await expect(items.nth(1)).toHaveAttribute('aria-current', 'true');
  await expect(page.getByTestId('bilgi-baslik')).toHaveText('VERSUS');

  await page.keyboard.press('Enter');
  await expect(page.getByTestId('bildirim')).toBeVisible();
  await expect(page.getByTestId('bildirim')).toHaveText('VERSUS · YAKINDA');
  await expect(menu).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('baslik')).toBeVisible();
  await expect(menu).toBeHidden();
});

test('fareyle tıklamak da çalışır: başlığa tıkla, menüde seçeneğe tıkla', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('baslik').click();
  const item = page.getByTestId('menu-secenek').nth(3);
  await item.click();
  await expect(item).toHaveAttribute('aria-current', 'true');
  await expect(page.getByTestId('bildirim')).toHaveText('TURNUVA · YAKINDA');
});

test('1366×768 pencerede sahne pencerenin içinde ve ortalı', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  const box = await page.locator('#arayuz').boundingBox();
  expect(box).toMatchObject({ x: 203, width: 960, height: 540 });
  await page.keyboard.press('Enter');
  const last = await page.getByTestId('menu-secenek').last().boundingBox();
  const hints = await page.locator('.alt-serit').boundingBox();
  expect(last).not.toBeNull();
  expect(hints).not.toBeNull();
  // Son seçenek alt ipucu şeridinin altında kalmamalı
  if (last && hints) expect(last.y + last.height).toBeLessThanOrEqual(hints.y);
});

test('başlığa dönüp yeniden girince YAKINDA bildirimi yine ilk basışta çıkar', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('bildirim')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('ana-menu')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('bildirim')).toBeVisible();
  await expect(page.getByTestId('bildirim')).toHaveText('ARCADE · YAKINDA');
});

test('Tab odağı oyundan dışarı (adres çubuğuna) kaçırmaz', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') (window as unknown as { tabEngellendi: boolean }).tabEngellendi = e.defaultPrevented;
    });
  });
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => (window as unknown as { tabEngellendi?: boolean }).tabEngellendi)).toBe(true);
});

test('başlıktan menüye geçerken oyun tam ekrana geçer (bir kez)', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { tamEkran: number };
    w.tamEkran = 0;
    Element.prototype.requestFullscreen = () => {
      w.tamEkran += 1;
      return Promise.resolve();
    };
  });
  await page.goto('/');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => (window as unknown as { tamEkran: number }).tamEkran)).toBe(1);
});

test('tam ekrana geçince Esc tuşu oyuna ayrılır (geri tuşu olarak çalışsın diye)', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { kilit?: string[] };
    Object.defineProperty(navigator, 'keyboard', {
      configurable: true,
      value: {
        lock: (codes: string[]) => {
          w.kilit = codes;
          return Promise.resolve();
        },
      },
    });
  });
  await page.goto('/');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as unknown as { kilit?: string[] }).kilit)).toEqual(['Escape']);
});

test('ana menüden hız testine gidilir', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Enter');
  await page.getByRole('link', { name: 'HIZ TESTİ' }).click();
  await expect(page).toHaveURL(/\/hiz-testi$/);
  await expect(page.getByTestId('hiz-sonuc')).toHaveText('HAZIR');
});
