# SysKO

SysKO: tarayıcıda (ve ileride Windows masaüstünde) çalışan, MUGEN ruhunda, HD pixel art karakterli 2D dövüş oyunu. Emir ve yakın çevresi için; aile içinde yerel ve online oynanır.

- Tasarım dokümanı (kanonik): https://claude.ai/artifact/YZySHevHDL6XFd8txZquhE — depo kopyası `docs/superpowers/specs/`
- Aşama planları: `docs/superpowers/plans/`
- Onaylı ekran tasarımları (16 ekran, kale teması; Emir onayı 2026-11-25): https://claude.ai/artifact/YHqLwH6gqvpjpvcJ7Ezb4A
- Tasarım sistemi (renkler, yazı, bileşenler): https://claude.ai/artifact/8DV46x9KQq4fch4AevUMft

## Görseller ve arayüz kiti

- Sanatsal görseller (arka planlar, logo, sahneler) Canva AI ile üretilir. Menü arka planı ve logo `tools/art/prepare.py` ile `apps/game/public/art/` altına hazırlanır.
- Arayüz kiti (piksel çerçeveler, butonlar, kurdeleler, tablolar) `tools/ui-kit/kit.py` ile `apps/game/src/ui/kit.css` olarak üretilir; bu dosya elle değiştirilmez. Renkler `apps/game/src/ui/tokens.json`'dan gelir.

## Gereksinimler

- Node 22 (`.nvmrc`)
- pnpm 10 (`corepack enable` sonrası `package.json` içindeki `packageManager` sürümü kullanılır)

## Komutlar

| Komut                            | Ne yapar                                           |
| -------------------------------- | -------------------------------------------------- |
| `pnpm install --frozen-lockfile` | Bağımlılıkları kilit dosyasındaki sürümlerle kurar |
| `pnpm lint`                      | Biome ile biçim ve kod denetimi                    |
| `pnpm format`                    | Biçimi otomatik düzeltir                           |
| `pnpm typecheck`                 | Tüm paketlerde TypeScript tür denetimi             |
| `pnpm test`                      | Birim testleri (Vitest)                            |
| `pnpm build`                     | Tüm paketleri derler                               |
| `pnpm e2e`                       | Uçtan uca testler (Playwright: Chromium + Firefox) |

## Kurallar

- Bağımlılık sürümleri tam sabittir (`^` / `~` yok); `tools/check-pins.test.ts` bunu denetler.
- Arayüz metinleri Türkçedir; büyük harf için CSS `text-transform: uppercase` kullanılmaz.
- `main` üretimdir; diğer dallar önizleme adresine gider. İş dallarda yapılır, PR ile birleşir.
- Gizli bilgi (token, anahtar, şifre) depoya girmez.

## Yayın akışı

- Her push'ta GitHub Actions (`.github/workflows/ci.yml`) sırayla `lint`, `typecheck`, `test`, `build` ve Chromium + Firefox'ta `e2e` çalıştırır.
- Cloudflare Workers Builds depoya bağlıdır:
  - `main` → üretim: `https://dovus-oyunu.<hesap-alt-alanı>.workers.dev`
  - diğer dallar → dal önizlemesi (`wrangler preview`): `https://<dal>-dovus-oyunu.<hesap-alt-alanı>.workers.dev`
- Cloudflare derleme ayarları:

| Ayar                      | Değer                                          |
| ------------------------- | ---------------------------------------------- |
| Derleme komutu            | `pnpm install --frozen-lockfile && pnpm build` |
| Üretim (deploy) komutu    | `npx wrangler deploy`                          |
| Önizleme komutu           | `npx wrangler preview`                         |
| Üretim dalı               | `main`                                         |
| Diğer dallar için derleme | açık                                           |

- Yayındaki bir adresi denetlemek: `E2E_BASE_URL=<adres> E2E_EXPECT_VERSION=<7 karakterlik commit> pnpm e2e smoke`
- Her ekranın sol altındaki `Sürüm: <kod> (<dal>)` satırı hangi commit'in ve dalın açık olduğunu gösterir.
