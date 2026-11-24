# Dövüş Oyunu

Tarayıcıda (ve ileride Windows masaüstünde) çalışan, MUGEN ruhunda, HD pixel art karakterli 2D dövüş oyunu. Emir ve yakın çevresi için; aile içinde yerel ve online oynanır.

- Tasarım dokümanı (kanonik): https://claude.ai/artifact/YZySHevHDL6XFd8txZquhE — depo kopyası `docs/superpowers/specs/`
- Aşama planları: `docs/superpowers/plans/`

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
