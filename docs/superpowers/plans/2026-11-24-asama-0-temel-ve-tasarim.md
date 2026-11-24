# Aşama 0: Temel ve Tasarım Dili — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Hedef:** Oyunun deposunu, otomatik test ve yayın hattını kurmak; tüm ekranların onaylanmış tasarımını (tasarım sistemi, ekran mockup'ları, logo) çıkarmak.

**Mimari:** pnpm monorepo. Tek bir Cloudflare Worker hem oyun dosyalarını (statik varlıklar) hem `/api/*` uç noktalarını sunar. GitHub → Cloudflare Workers Builds: `main` üretime, diğer dallar sabit önizleme adresine gider. Ekran tasarımları Claude Design ve Claude Design System'de, logo ve basılı malzeme Canva'da yapılır.

**Teknoloji:** Node 22 LTS, pnpm 10, TypeScript (strict), Vite, Hono, Wrangler, Vitest, Playwright (Chromium + Firefox), Biome, GitHub Actions, fontkit.

**Spec:** [Dövüş Oyunu — Tasarım Dokümanı](https://claude.ai/artifact/YZySHevHDL6XFd8txZquhE) (kanonik kaynak). Depo kopyası: `docs/superpowers/specs/2026-11-24-dovus-oyunu-design.md` (Görev 1).

## Global Constraints

- Node 22 LTS; pnpm 10, kök `package.json` içinde `"packageManager"` alanıyla sabitlenir.
- Tüm bağımlılık sürümleri tam sabit (`^` ve `~` yok); `pnpm-lock.yaml` depoya girer.
- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`.
- Arayüz dili Türkçe; `<html lang="tr">`. Büyük harf için CSS `text-transform: uppercase` kullanılmaz; metin büyük harfle yazılır (i→İ hatasını önler).
- Kullanılan her yazı tipi şu glifleri içerir: `ğüşıİöçĞÜŞÖÇ`.
- Oyun dünyası temel çözünürlüğü 960×540; ölçek tam sayı kat, sığmıyorsa oranlı küçültme. Mockup artboard'ları 1920×1080.
- Metin kontrastı: gövde ≥ 4.5:1, 44 px ve üstü başlık ≥ 3:1.
- Sunucu Cloudflare ücretsiz planında; ödeme kartı gerektiren ürün (R2 dahil) kullanılmaz.
- `main` = üretim, diğer dallar = önizleme. Aşama 0 işi `asama-0` dalında yürür; kapıda PR ile `main`'e birleşir.
- Gizli bilgi (token, anahtar, şifre) depoya ve sohbete girmez; hesap işlemlerini Emir kendi ekranında yapar.
- Commit mesajları Conventional Commits; her commit şu iki satırla biter:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_013vMem738rkPiuwxMy2GYuM`

## Review Focus

1. **Türkçe harfler:** Büyük harf dönüşümü ve eksik glifler "İ/ı" ile "ğ/ş" yazılarını bozabilir; beklenti her ekranda doğru Türkçe. → Görev 2 (`lang="tr"` testi), Görev 5 (glif testi).
2. **SPA ile API çakışması:** Derin bir sayfa yolu (`/turnuva/123`) oyunu açmalı, bilinmeyen bir `/api/...` yolu HTML değil JSON 404 dönmeli. → Görev 3 ve Görev 4'teki uçtan uca testler.
3. **Hangi sürümü test ediyorum?** Emir önizleme ile üretimi karıştırabilir; beklenti her ekranda kısa commit kodu ve dal adı görünmesi. → Görev 2 ve Görev 3 testleri.
4. **Alışılmadık pencere boyutları:** 1366×768 dizüstü, 2560×1440 monitör, dikey pencere; beklenti oyun alanının oranının korunması, pikselin bulanıklaşmaması. → Görev 2 `computeScale` testleri.
5. **Oyun koluyla gezinme:** Mockup'larda seçili/odak durumu yoksa ekranlar yalnızca fareyle düşünülmüş olur; beklenti her etkileşimli öğenin odak hali. → Görev 6 inceleme listesi.

---

### Task 1: Görev 1 — Depo ve araç zinciri

**Emir'in adımı (Claude sohbette adım adım anlatır):** GitHub'da boş, **özel (private)** bir depo açar: adı `dovus-oyunu`, README eklenmez. Claude ardından `add_repo` ile push yetkisi ister ve depoyu klonlar.

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `biome.json`, `vitest.workspace.ts`, `.gitignore`, `.nvmrc` (`22`), `README.md`
- Create: `docs/superpowers/specs/2026-11-24-dovus-oyunu-design.md` (tasarım dokümanının markdown kopyası, başında kanonik bağlantı)
- Create: `docs/superpowers/plans/2026-11-24-asama-0-temel-ve-tasarim.md` (bu plan)
- Test: `tools/check-pins.test.ts`

**Interfaces:**
- Produces: kök betikleri `pnpm lint` (Biome ci), `pnpm typecheck` (tüm paketler `tsc --noEmit`), `pnpm test` (Vitest), `pnpm build`, `pnpm e2e` (Playwright). Sonraki görevler bu adları kullanır.
- Produces: çalışma alanı klasörleri `apps/*`, `packages/*`, `tools/*`.

- [ ] **Step 1: Sabitlenmemiş sürümü yakalayan testi yaz**

```ts
// tools/check-pins.test.ts
import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const files = globSync('**/package.json', { exclude: (p) => p.includes('node_modules') });

describe('bağımlılık sürümleri', () => {
  it.each(files)('%s içindeki her sürüm tam sabit', (file) => {
    const pkg = JSON.parse(readFileSync(file, 'utf8'));
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const [name, version] of Object.entries(all)) {
      expect(version, `${file} → ${name}`).toMatch(/^(\d+\.\d+\.\d+(-[\w.]+)?|workspace:\*)$/);
    }
  });
});
```

- [ ] **Step 2: Kasıtlı olarak `^` içeren bir devDependency ile testi çalıştır, düştüğünü gör**

Run: `pnpm test tools/check-pins.test.ts` → Expected: FAIL, mesajda paket adı.

- [ ] **Step 3: Araçları tam sürümle kur** (`pnpm add -D -E typescript vitest @biomejs/biome`), `pnpm-workspace.yaml` içine `apps/*`, `packages/*`, `tools/*`; `tsconfig.base.json` Global Constraints'teki ayarlarla.

- [ ] **Step 4: Doğrula**

Run: `pnpm lint && pnpm typecheck && pnpm test` → Expected: hepsi geçer.

- [ ] **Step 5: Tasarım dokümanını ve bu planı `docs/superpowers/` altına koy; commit**

```bash
git switch -c asama-0
git add -A && git commit -m "chore: depo, araç zinciri ve sürüm sabitleme testi"
```

---

### Task 2: Görev 2 — Oyun kabuğu ve tam sayı ölçekleme

Aşama 0'ın görünen yüzü: 960×540 tuvale çizilmiş bir piksel deseni, altında sürüm bilgisi. Emir bununla kendi monitöründe ölçeklemenin keskin olduğunu görür. PixiJS henüz yok (Aşama 1).

**Files:**
- Create: `apps/game/package.json`, `apps/game/vite.config.ts`, `apps/game/index.html` (`lang="tr"`, başlık "Dövüş Oyunu")
- Create: `apps/game/src/main.ts` (tuvali kurar, `computeScale` uygular, `/api/health`'ten sürümü yazar)
- Create: `apps/game/src/viewport/scale.ts`
- Test: `apps/game/src/viewport/scale.test.ts`, `e2e/shell.spec.ts`, `playwright.config.ts`

**Interfaces:**
- Produces: `computeScale(viewportWidth: number, viewportHeight: number, baseWidth?: number, baseHeight?: number): ScaleResult` — varsayılan taban 960×540.
- Produces: `type ScaleResult = { scale: number; width: number; height: number; offsetX: number; offsetY: number; pixelPerfect: boolean }`
- Produces: sürüm satırı `data-testid="surum"`, metni `Sürüm: <kod> (<dal>)`.
- Consumes: Görev 3'ün `GET /api/health` cevabı.

- [ ] **Step 1: Ölçekleme testlerini yaz**

```ts
// apps/game/src/viewport/scale.test.ts
import { describe, expect, it } from 'vitest';
import { computeScale } from './scale';

describe('computeScale', () => {
  it('1920×1080: tam 2 kat', () => {
    expect(computeScale(1920, 1080)).toEqual({ scale: 2, width: 1920, height: 1080, offsetX: 0, offsetY: 0, pixelPerfect: true });
  });
  it('3840×2160: tam 4 kat', () => expect(computeScale(3840, 2160).scale).toBe(4));
  it('2560×1440: 2 kat, ortalı', () => {
    expect(computeScale(2560, 1440)).toEqual({ scale: 2, width: 1920, height: 1080, offsetX: 320, offsetY: 180, pixelPerfect: true });
  });
  it('1366×768: 1 kat, ortalı', () => {
    expect(computeScale(1366, 768)).toEqual({ scale: 1, width: 960, height: 540, offsetX: 203, offsetY: 114, pixelPerfect: true });
  });
  it('1080×1920 dikey: genişliğe göre 1 kat', () => {
    expect(computeScale(1080, 1920)).toEqual({ scale: 1, width: 960, height: 540, offsetX: 60, offsetY: 690, pixelPerfect: true });
  });
  it('800×600: tabandan küçük, oranlı küçültme', () => {
    expect(computeScale(800, 600)).toEqual({ scale: 800 / 960, width: 800, height: 450, offsetX: 0, offsetY: 75, pixelPerfect: false });
  });
});
```

- [ ] **Step 2: Çalıştır, düştüğünü gör** — Run: `pnpm test apps/game` → Expected: FAIL "computeScale is not defined".

- [ ] **Step 3: `computeScale`'i yaz.** Tam sayı kat = `Math.floor(min(vw/bw, vh/bh))`; 1'den küçükse oranlı ölçek ve `pixelPerfect: false`; ofsetler `Math.floor`. Tuval CSS'i `image-rendering: pixelated`.

- [ ] **Step 4: Birim testleri geçir** — Run: `pnpm test apps/game` → Expected: PASS.

- [ ] **Step 5: Uçtan uca testleri yaz** (`e2e/shell.spec.ts`; Playwright `webServer` = `wrangler dev`, projeler Chromium ve Firefox)

```ts
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
```

- [ ] **Step 6: Görev 3 bitince çalıştır** — Run: `pnpm build && pnpm e2e` → Expected: iki tarayıcıda PASS.

- [ ] **Step 7: Commit** — `feat(game): oyun kabuğu ve tam sayı ölçekleme`

---

### Task 3: Görev 3 — Sunucu (tek Worker: oyun dosyaları + API)

**Files:**
- Create: `wrangler.jsonc` (kökte), `apps/server/package.json`, `apps/server/src/index.ts`, `apps/server/src/app.ts`
- Create: `tools/write-version.ts` (derlemeden önce `apps/server/src/version.generated.ts` dosyasını yazar)
- Test: `apps/server/src/app.test.ts`, `e2e/server.spec.ts`

**Interfaces:**
- Produces: `app: Hono` (`apps/server/src/app.ts`), `GET /api/health` → `200 { ok: true, version: string, branch: string, builtAt: string }`; bilinmeyen `/api/*` → `404 { error: "not_found" }`, `content-type: application/json`.
- Produces: `version.generated.ts` → `export const VERSION: string; export const BRANCH: string; export const BUILT_AT: string;` Commit kodu 7 karakter; yerelde `dev`.

Wrangler yapılandırması (karar):

```jsonc
{
  "name": "dovus-oyunu",
  "main": "./apps/server/src/index.ts",
  "compatibility_date": "2026-11-24",
  "assets": {
    "directory": "./apps/game/dist",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]
  }
}
```

- [ ] **Step 1: API testlerini yaz**

```ts
// apps/server/src/app.test.ts
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
```

- [ ] **Step 2: Çalıştır, düştüğünü gör** — `pnpm test apps/server` → FAIL.

- [ ] **Step 3: `app.ts` ve `index.ts`'i yaz; `tools/write-version.ts`'i yaz.** Commit ve dal bilgisini Workers Builds ortam değişkenlerinden okur, yoksa `git rev-parse`'tan, o da yoksa `dev`. Değişken adlarını Cloudflare Workers Builds belgelerinden doğrula ve dosyanın başına yorum olarak yaz.

- [ ] **Step 4: Testleri geçir** — `pnpm test apps/server` → PASS.

- [ ] **Step 5: SPA uçtan uca testini yaz** (`e2e/server.spec.ts`): `/turnuva/123` 200 döner ve `surum` görünür; `request.get('/api/yok')` 404 ve JSON döner. Run: `pnpm build && pnpm e2e` → PASS.

- [ ] **Step 6: Commit** — `feat(server): tek Worker ile oyun dosyaları ve health uç noktası`

---

### Task 4: Görev 4 — Sürekli test ve otomatik yayın

**Emir'in adımları (Claude sohbette ekran ekran anlatır):** Cloudflare hesabı açar (ücretsiz plan) → Workers & Pages → GitHub deposunu bağlar (`dovus-oyunu`) → derleme ayarlarını Claude'un verdiği değerlerle girer → "Builds for non-production branches" kutusunu işaretler.

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `README.md` (yayın akışı ve adresler)
- Test: `e2e/smoke.spec.ts` (yalnızca `E2E_BASE_URL` verilince çalışır)

**Interfaces:**
- Consumes: Görev 1'in kök betikleri; Görev 3'ün `/api/health` cevabı.
- Produces: üretim adresi `https://dovus-oyunu.<hesap-alt-alanı>.workers.dev`, dal önizlemesi `https://<dal>-dovus-oyunu.<hesap-alt-alanı>.workers.dev`.

Cloudflare derleme ayarları (karar): derleme komutu `pnpm install --frozen-lockfile && pnpm build`; üretim komutu `npx wrangler deploy`; önizleme komutu `npx wrangler versions upload`; üretim dalı `main`.

- [ ] **Step 1: CI iş akışını yaz.** Her push ve PR'da sırayla: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, Playwright tarayıcı kurulumu, `pnpm e2e`.

- [ ] **Step 2: Duman testini yaz** (`e2e/smoke.spec.ts`): `E2E_BASE_URL` adresinde sayfa açılır, `surum` metnindeki kod `/api/health` cevabındaki `version` ile aynıdır.

- [ ] **Step 3: `asama-0` dalını gönder; CI'ın yeşil olduğunu doğrula** — Expected: GitHub Actions'ta tüm adımlar geçer.

- [ ] **Step 4: Emir'in Cloudflare bağlantısından sonra önizlemeyi doğrula** — Run: `E2E_BASE_URL=<dal önizleme adresi> pnpm e2e smoke` → PASS; sayfadaki kod son commit ile aynı.

- [ ] **Step 5: Commit** — `ci: sürekli test ve Cloudflare yayın akışı`

---

### Task 5: Görev 5 — Tasarım sistemi

**Araç:** Claude Design System türünde bir artifact. Tasarım sistemi oyunun kendi kimliğidir; proje sunumunun renkleriyle aynı olmak zorunda değildir.

**Files (depoya alınan çıktı):**
- Create: `apps/game/src/ui/tokens.json` (tasarım sisteminin `tokens.json`'ından kopya)
- Create: `apps/game/public/fonts/` (seçilen yazı tipi dosyaları ve lisansları)
- Test: `tools/fonts/glyphs.test.ts`, `tools/contrast/contrast.test.ts`

**Interfaces:**
- Produces: `tokens.json` içinde `color.*`, `font.*`, `space.*`, `radius.*` ve kontrol edilecek metin/zemin çiftleri `contrastPairs: [foreground, background, minRatio][]` (renkler token yolu olarak, örn. `"color.text.primary"`).
- Produces: `tools/contrast/contrast.ts` → `contrastRatio(hexA: string, hexB: string): number` (WCAG 2.x formülü) ve `resolve(tokenPath: string): string` (token yolundan `#rrggbb`).
- Produces: Görev 6'nın kullanacağı bileşen adları: `Button` (normal/odak/basılı/devre dışı), `MenuItem`, `Panel`, `HealthBar`, `PowerGauge` (3 bar), `RoundTimer`, `RoundMarks`, `PortraitFrame`, `ComboCounter`, `BracketNode`, `TierBadge`, `Toast`.

Yazı tipi seçim ölçütleri (karar): açık lisans (OFL), Türkçe gliflerin tamamı, oyun içi yazı için piksel ızgarasına oturan bir başlık yazı tipi ve menüler için okunaklı bir metin yazı tipi. Seçimin gerekçesi tasarım sisteminin README'sine yazılır.

- [ ] **Step 1: Glif ve kontrast testlerini yaz**

```ts
// tools/fonts/glyphs.test.ts
const REQUIRED = [...'ğüşıİöçĞÜŞÖÇ'];
it.each(fontFiles)('%s Türkçe harflerin hepsini içerir', (file) => {
  const font = fontkit.openSync(file);
  for (const ch of REQUIRED) expect(font.hasGlyphForCodePoint(ch.codePointAt(0)!), `${file}: ${ch}`).toBe(true);
});

// tools/contrast/contrast.test.ts
it.each(tokens.contrastPairs)('%s / %s en az %s:1', (fg, bg, min) => {
  expect(contrastRatio(resolve(fg), resolve(bg))).toBeGreaterThanOrEqual(min);
});
```

- [ ] **Step 2: Henüz yazı tipi ve token yokken çalıştır** → Expected: FAIL (dosya yok).

- [ ] **Step 3: Tasarım sistemini Claude Design System'de kur; token ve yazı tiplerini depoya al.** `contrastPairs` en az şu çiftleri içerir: gövde metni/zemin (4.5), ikincil metin/zemin (4.5), başlık/zemin (3), buton metni/buton zemini (4.5), HUD yazısı/HUD paneli (4.5).

- [ ] **Step 4: Testleri geçir** — `pnpm test tools` → PASS.

- [ ] **Step 5: Commit** — `feat(ui): tasarım sistemi token'ları ve yazı tipleri`

---

### Task 6: Görev 6 — Ekran mockup'ları

**Araç:** Claude Design türünde bir artifact; her ekran 1920×1080 artboard. Karakter yerine tasarımı belirsiz siluetler kullanılır (başka oyunların karakterleri ya da logoları hiçbir yerde yok).

**Ekran listesi (spec B. 6.5 ve 9):**
1. Açılış logosu, Başlık ("Bir tuşa bas")
2. Ana menü
3. Karakter seçimi: 6 yuva, 16 yuvaya kadar büyüyen ızgara; renk ve kontrol tipi (Klasik/Modern) seçimi
4. Sahne seçimi, VS ekranı
5. Dövüş HUD'u: can barları, güç göstergesi, süre, raunt işaretleri, kombo sayacı, oyuncu adı ve puanı; 960×540 güvenli alan çizgisi
6. Antrenman HUD'u: vuruş kutusu gösterimi, kare verisi, tuş geçmişi
7. Duraklatma menüsü, raunt/maç sonu, sonuç (puan değişimi)
8. Online lobi (çevrimiçi liste, davet, sıralı kuyruk, bağlantı kalitesi)
9. Turnuva ağacı (tek ve çift eleme, canlı maç, izleyici)
10. Profil ve sıralama tablosu (küme rozetleri, sezon)
11. Davet bağlantısıyla ilk giriş ve profil seçimi
12. Ayarlar: Kontroller, Görüntü, Ses, Ağ, Erişilebilirlik
13. Karakter Stüdyosu: yalnızca kaba yerleşim (ayrıntısı Aşama 4'te)

- [ ] **Step 1: Ekranları tasarım sistemi bileşenleriyle çiz.** Her etkileşimli öğenin odak hali gösterilir; ekran başına bir "klavye / oyun kolu tuş ipuçları" satırı bulunur.
- [ ] **Step 2: İnceleme listesi** — Her artboard'da: Türkçe metin ve harfler doğru; kontrast çiftleri tasarım sistemiyle uyumlu; odak hali var; HUD öğeleri 960×540 güvenli alanın içinde. Her maddeyi ekran görüntüsünde tek tek işaretle.
- [ ] **Step 3: Emir'e sun.** Sohbette ekran ekran bağlantı ve kısa açıklama; geri bildirimleri işle.
- [ ] **Step 4: Kapı — Emir mockup'ları onaylar.** Onaylanan sürümün bağlantısı `README.md`'ye yazılır; commit `docs: onaylı ekran tasarımları`.

---

### Task 7: Görev 7 — Oyunun adı ve logo

**Emir'in adımı:** Oyunun adını verir (spec B. 15, açık soru).

**Araç:** Canva (logo ve kapak görseli), Claude Design (başlık ekranına yerleşim).

**Files:**
- Create: `apps/game/public/brand/logo.svg`, `apps/game/public/brand/logo@2x.png`, `apps/game/public/brand/logo-960.png` (960×540 başlık ekranı için piksel uyumlu)
- Modify: `apps/game/index.html` (başlık ve favicon)

- [ ] **Step 1: Ad gelince Canva'da 3–4 logo yönü üret;** her biri 960×540 başlık ekranında piksel ölçeğinde de okunur olmalı.
- [ ] **Step 2: Emir birini seçer; seçilen logo başlık ekranı mockup'ına yerleştirilir.**
- [ ] **Step 3: Dosyaları depoya al; `pnpm e2e` geçer (sayfa başlığı yeni adı içerir).**
- [ ] **Step 4: Commit** — `feat(brand): oyun adı ve logo`

---

### Aşama 0 kapısı

- [ ] CI yeşil; önizleme ve üretim adresleri çalışıyor; sayfadaki sürüm kodu son commit ile aynı.
- [ ] Emir onaylı mockup'lar ve logo.
- [ ] `asama-0` → `main` PR'ı açılır, Emir onaylar, birleşir; üretim adresi güncellenir.
- [ ] Tasarım dokümanının "Kararlar" bölümüne oyunun adı ve tasarım sistemi bağlantısı eklenir.
