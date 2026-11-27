/// <reference lib="dom" />
import { expect, type Page, test } from '@playwright/test';

/** Dövüş ekranının okunabilir özeti (window.__dovus). */
interface Ozet {
  ekran: string;
  evre: number;
  raunt: number;
  can: [number, number];
  galibiyet: [number, number];
  kazanan: number;
  sure: number;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Element.prototype.requestFullscreen = () => Promise.resolve();
  });
});

const ozet = (page: Page): Promise<Ozet> =>
  page.evaluate(() => (window as unknown as { __dovus: () => Ozet }).__dovus());

/** Başlıktan ana menüye, oradan n'inci seçeneğe (0 = ARCADE) gidip açar. */
async function openFromMenu(page: Page, index: number): Promise<void> {
  await page.goto('/');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('ana-menu')).toBeVisible();
  for (let k = 0; k < index; k++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('katil')).toBeVisible();
}

/** Oyuncu 1 (klavye) yürüyüp ağır yumrukla vurur; koşul sağlanana kadar. */
async function fightUntil(page: Page, done: (o: Ozet) => boolean, maxRounds = 160): Promise<Ozet> {
  for (let k = 0; k < maxRounds; k++) {
    const o = await ozet(page);
    if (done(o)) return o;
    await page.keyboard.down('d');
    await page.waitForTimeout(120);
    await page.keyboard.up('d');
    await page.keyboard.press('i');
    await page.waitForTimeout(330);
  }
  throw new Error(`koşul gelmedi: ${JSON.stringify(await ozet(page))}`);
}

test('VERSUS: klavye Oyuncu 1, Enter ile kuklaya karşı; iki raunt alıp maçı kazanır, menüye döner', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await openFromMenu(page, 1);
  await expect(page.getByTestId('koltuk-p1')).toHaveText('BİR TUŞA BAS');
  await page.keyboard.press('u');
  await expect(page.getByTestId('koltuk-p1')).toHaveText('KLAVYE');
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('hud')).toBeVisible();
  await expect(page.getByTestId('katil')).toBeHidden();
  await expect(page.getByTestId('ad-p1')).toHaveText('OYUNCU 1');
  await expect(page.getByTestId('ad-p2')).toHaveText('KUKLA');
  await expect(page.getByTestId('duyuru-ana')).toHaveText('RAUNT 1');
  await expect(page.getByTestId('duyuru-ana')).toHaveText('DÖVÜŞ!');
  await expect(page.getByTestId('sure')).toHaveText('99');
  await expect(page.getByTestId('raunt-p1').locator('.ds-mark')).toHaveCount(2);

  const firstRound = await fightUntil(page, (o) => o.galibiyet[0] === 1);
  expect(firstRound.can[0]).toBe(1000);
  await expect(page.getByTestId('raunt-p1').locator('.ds-mark.is-won')).toHaveCount(1);

  await fightUntil(page, (o) => o.evre === 3);
  await expect(page.getByTestId('duyuru-ana')).toHaveText('OYUNCU 1 KAZANDI');
  await expect(page.getByTestId('duyuru-alt')).toHaveText('2 – 0');
  const end = page.getByTestId('son');
  await expect(end).toBeVisible();
  const items = end.getByTestId('dovus-secenek');
  await expect(items).toHaveText(['RÖVANŞ', 'ANA MENÜYE DÖN']);
  await expect(items.nth(0)).toHaveAttribute('aria-current', 'true');

  await page.waitForTimeout(500);
  await page.keyboard.press('ArrowDown');
  await expect(items.nth(1)).toHaveAttribute('aria-current', 'true');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('ana-menu')).toBeVisible();
  await expect(page.getByTestId('menu-secenek').nth(1)).toHaveAttribute('aria-current', 'true');
});

test('duraklatma: Esc durdurur, süre durur; Esc devam ettirir; ANA MENÜYE DÖN menüye götürür', async ({ page }) => {
  await openFromMenu(page, 1);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('duyuru-ana')).toHaveText('DÖVÜŞ!');
  await expect(page.getByTestId('sure')).toHaveText('98', { timeout: 5_000 });

  await page.keyboard.press('Escape');
  const pause = page.getByTestId('durak');
  await expect(pause).toBeVisible();
  await expect(pause).toContainText('Oyuncu 1 durdurdu');
  const frozen = (await ozet(page)).sure;
  await page.waitForTimeout(600);
  expect((await ozet(page)).sure).toBe(frozen);

  await page.keyboard.press('Escape');
  await expect(pause).toBeHidden();
  await expect.poll(async () => (await ozet(page)).sure).toBeLessThan(frozen);

  await page.keyboard.press('Escape');
  await expect(pause).toBeVisible();
  await page.waitForTimeout(500);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('ana-menu')).toBeVisible();
});

test('ANTRENMAN: tek oyuncu yeter, süre sonsuz, kuklanın canı kombo bitince dolar', async ({ page }) => {
  await openFromMenu(page, 4);
  await expect(page.getByTestId('koltuk-p2')).toHaveText('KUKLA');
  await page.keyboard.press('u');
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect(page.getByTestId('sure')).toHaveText('∞');
  await expect(page.getByTestId('ad-p2')).toHaveText('KUKLA');
  await fightUntil(page, (o) => o.can[1] < 1000, 40);
  await expect.poll(async () => (await ozet(page)).can[1], { timeout: 5_000 }).toBe(1000);
  expect((await ozet(page)).evre).toBe(1);
});

test('katılma ekranında Esc: önce oyuncu çıkar, sonra menüye dönülür', async ({ page }) => {
  await openFromMenu(page, 1);
  await page.keyboard.press('u');
  await expect(page.getByTestId('koltuk-p1')).toHaveText('KLAVYE');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('koltuk-p1')).toHaveText('BİR TUŞA BAS');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('ana-menu')).toBeVisible();
  await expect(page.getByTestId('menu-secenek').nth(1)).toHaveAttribute('aria-current', 'true');
});
