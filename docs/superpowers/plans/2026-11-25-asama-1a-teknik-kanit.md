# Aşama 1a — Teknik kanıt (hız testi) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aşama 1'in ilk haftasındaki teknik kanıt. İki kutu karakter dövüşür; ölçüm paneli gösterilir. Emir kendi bilgisayarında 10 dakikalık testi çalıştırır ve dört şartın geçtiğini görür.

**Architecture:** Yeni `packages/engine` paketi.
- Tam sayı (sabit noktalı) deterministik simülasyon: `step(state, inputs) → state`.
- Durum özeti (FNV-1a) ve rollback oturumu (en fazla 8 kare geri sarma).
- `apps/game` motoru tuvalde çizer, 60 Hz sabit adımlı döngüyle sürer ve ölçer.
- İki sekme arası gecikme testi: `BroadcastChannel` üzerinden yapay 150 ms gecikme. Gerçek ağ (WebRTC) Aşama 2'de gelir.

**Tech Stack:** TypeScript 7, Vitest 5, Vite 8, Playwright. Yeni bağımlılık yok.

**Spec:** `docs/superpowers/specs/2026-11-24-dovus-oyunu-design.md`. Bölüm 5.3 ve 5.4 çizim ve giriş; Bölüm 10 Aşama 1; Bölüm 11 teknik kanıt şartları.

## Global Constraints

- **Simülasyonda yalnız tam sayı:**
  - Konum birimi taban pikselin 1/256'sı.
  - `Math.imul`, `| 0` ve tam sayı bölme kullanılır.
  - `Math.random`, `Date`, `performance` ve float trigonometri simülasyonda yasak.
  - Rastgelelik tohumlu xorshift32 ile.
- Simülasyon 60 Hz sabit adımla ilerler; çizim ayrıdır.
- **Teknik kanıt şartları (spec Bölüm 11), aynen:**
  - 10 dakika boyunca saniyede 60 kare ve tek kare düşmemesi.
  - Bir simülasyon adımı 1 ms'nin altında.
  - 8 karelik geri sarma 4 ms'nin altında.
  - Yapay 150 ms gecikmede iki tarayıcı hep aynı durum özetini verir.
- Emir'in bilgisayarında ölçülür. Kontrolcü: PlayStation uyumlu, tarayıcı standart eşlemesi; 0 = ×, 1 = ○, 2 = □, 3 = △.
- Bağımlılıklar tam sabit; arayüz yazıları Türkçe.

## Review Focus

1. **Sekme arka plana alınırsa:** requestAnimationFrame durur. Bu, test sonucunu sessizce "kare düştü" yapmamalı. Test "geçersiz (sekme gizlendi)" diye işaretlenir.
2. **Ekran tazelemesi:** 120 veya 144 Hz ekranlarda kare düşmesi ekranın kendi aralığına göre ölçülür. Simülasyon yine saniyede tam 60 adım atar.
3. **İkinci sekme yokken:** Gecikme testi açılınca "ikinci sekme bekleniyor" der; çökmez. İkinci sekme kapanırsa bunu gösterir.
4. **Durum özeti:** Yalnız iki tarafın da girdisi kesinleşmiş karelerde karşılaştırılır, tahmin edilen karelerde değil.
5. **Ters basış:** Klavyede sol ve sağ aynı anda basılıysa nötr sayılır (spec 5.4).

---

### Task 1: Deterministik çekirdek araçları

**Files:**
- Create: `packages/engine/package.json`, `packages/engine/tsconfig.json`
- Create: `packages/engine/src/fixed.ts`, `rng.ts`, `hash.ts`
- Test: `packages/engine/src/core.test.ts`

**Interfaces:**
- Produces: `FX = 256`, `toFx(px: number): number`, `fxToPx(v: number): number`.
- Produces: `class Rng { constructor(seed: number); next(): number /* uint32 */; int(n: number): number }`.
- Produces: `hashInts(values: Iterable<number>, seed?: number): number /* FNV-1a 32-bit over int32 little-endian bytes */`.

- [ ] Tests:
  - `Rng(1)` first five values equal a fixed list, computed once by hand from xorshift32 (13, 17, 5) and written into the test.
  - `int(n)` is in [0, n).
  - `hashInts([])` = `0x811c9dc5`.
  - `hashInts([1, 2])` ≠ `hashInts([2, 1])`.
  - `toFx(1)` = 256.
- [ ] RED → implement → GREEN. Commit `feat(engine): deterministik çekirdek araçları`.

### Task 2: Kutu dövüşçü simülasyonu

**Files:**
- Create: `packages/engine/src/input.ts`, `sim.ts`
- Test: `sim.test.ts`, `determinism.test.ts`

**Interfaces:**
- `Input` is a bitmask: `UP=1, DOWN=2, LEFT=4, RIGHT=8, LP=16, HP=32, LK=64, HK=128`.
- `cleanInput(i: number): number`: LEFT plus RIGHT gives neither; UP plus DOWN gives neither.
- `interface Fighter { x; y; vx; vy; facing: 1 | -1; hp; state: FighterState; stateFrame; hitstun; }`. All fields are int32.
- `interface SimState { frame: number; fighters: [Fighter, Fighter]; rngSeed: number }`
- `initialState(seed: number): SimState`
- `step(s: SimState, inputs: readonly [number, number]): SimState`: pure; returns a new object.
- `hashState(s: SimState): number`
- `boxes(f: Fighter): { hurt: Box; hit: Box | null }`, with `Box = { x; y; w; h }` in fx units.

The box fighters have these values (starting numbers, tuned in Aşama 1):
- **Size:** 60×160 base px.
- **Walk:** 3 px per frame.
- **Jump:** vy −14 px per frame, gravity 0.75 px per frame².
- **Floor:** y = 440.
- **Light punch (LP):** startup 4, active 3, recovery 8 frames; hitbox 50×20 px in front at chest height; damage 50; hitstun 14.
- **Heavy punch (HP):** startup 8, active 4, recovery 18 frames; damage 100; hitstun 20.
- **Facing:** each fighter always faces the other.
- **Push box:** the two fighters cannot overlap.
- **Stage edges:** 30 to 930 px.
- **HP:** 1000 each.

- [ ] Tests:
  - Holding RIGHT moves the fighter 3 px per frame.
  - Jumping returns to the floor after the computed number of frames.
  - LP hits at frame 4 when in range.
  - A hit removes 50 HP and puts the opponent in 14 frames of hitstun.
  - The push box keeps the fighters apart.
  - Opposite directions held together cancel out.
  - `step` does not mutate its input.
- [ ] Determinism test, 10,000 random matches:
  - Each match has a seeded input stream of 600 frames.
  - Run every match twice.
  - The two runs give equal hashes.
  - The combined hash of all 10,000 matches equals a recorded constant (written after the first run).
  - The test must finish in under 20 s.
- [ ] RED → GREEN. Commit `feat(engine): kutu dövüşçü simülasyonu`.

### Task 3: Rollback oturumu

**Files:**
- Create: `packages/engine/src/rollback.ts`
- Test: `rollback.test.ts`

**Interfaces:**
- `class RollbackSession`:
  - `constructor(opts: { seed: number; local: 0 | 1; maxRollback: 8; delay: number })`
  - `addLocal(frame: number, input: number): void`
  - `addRemote(frame: number, input: number): void`
  - `advance(): void`: steps one frame, predicting missing remote input as the last known input.
  - `state: SimState`
  - `confirmedFrame: number`
  - `confirmedHash(frame: number): number | undefined`
  - `lastRollbackFrames: number`
- `function randomRewindRun(seed: number, frames: number): { plain: number; rewound: number }`: runs the same inputs with and without random rewinds of 1–8 frames and returns both final hashes.

- [ ] Tests:
  - Remote input arriving late (3 frames) triggers a rollback of 3 and gives the same final hash as an on-time run.
  - `randomRewindRun` over 200 seeds always has `plain === rewound`.
  - A rollback deeper than 8 frames throws.
- [ ] RED → GREEN. Commit `feat(engine): rollback oturumu`.

### Task 4: Çizim, döngü ve ölçüm paneli

**Files:**
- Create: `apps/game/src/hiz-testi/loop.ts`, `metrics.ts`, `render.ts`, `panel.ts`, `index.ts`
- Test: `metrics.test.ts`

**Interfaces:**
- `class Metrics`:
  - `frame(dtMs: number): void`
  - `stepTime(ms: number): void`
  - `rollbackTime(ms: number, frames: number): void`
  - `hidden(): void`
  - `summary(): { seconds; fps; dropped; maxStepMs; maxRollback8Ms; valid: boolean; verdict: 'GEÇTİ' | 'KALDI' | 'GEÇERSİZ' }`
- A dropped frame is a display interval longer than 1.5 × the median interval of the first 120 frames.
- The display interval is the measured rAF period, so the rule works on 60, 120 and 144 Hz screens.
- The verdict counts only when the test ran for the full duration; it is `GEÇERSİZ` if the tab was hidden at any point.
- `render(ctx, state)`:
  - Draws the floor line, each fighter's hurtbox (P1 orange, P2 blue), active hitboxes in red, HP bars and the frame counter.
  - Draws on the 960×540 canvas.
- Loop:
  - Fixed 60 Hz accumulator; each simulation step is timed with `performance.now()`.
  - Every 60 frames it forces an 8-frame rollback (resimulate the last 8) and times it.

- [ ] Metrics tests:
  - The median-based drop rule holds at 60 Hz and 144 Hz synthetic intervals.
  - A hidden event makes the result `GEÇERSİZ`.
  - The verdict thresholds match the Global Constraints exactly.
- [ ] Page `/hiz-testi` (SPA route):
  - "10 DAKİKALIK TESTİ BAŞLAT" button; the test also runs with `?sure=10` seconds for e2e.
  - Panel in the castle-theme kit.
  - The opponent is the CPU: a seeded random input stream.
- [ ] Commit `feat(game): hız testi sayfası ve ölçüm paneli`.

### Task 5: İki sekme gecikme testi

**Files:**
- Create: `apps/game/src/hiz-testi/link.ts`
- Test: `link.test.ts`
- Modify: `index.ts`

**Interfaces:**
- `class DelayedLink { constructor(channel: { postMessage(m: unknown): void; onmessage: ((e: { data: unknown }) => void) | null }, delayMs: number, rng: () => number); send(m: unknown): void; onReceive(cb: (m: unknown) => void): void }`
- The link adds the delay plus or minus up to 20 ms of jitter; message order is not guaranteed.
- The mode is opened with `/hiz-testi?gecikme=150`. The first tab becomes P1 and the second P2, decided by a hello handshake.
- Each tab sends:
  - Its local input for the frame, together with the last 8 inputs.
  - Every 60 frames, its confirmed hash.
- The panel shows "SENKRON: AYNI (n karşılaştırma)" or "SENKRON: FARKLI (kare k)".

- [ ] Tests (`link.test.ts`, with fake timers and a fake channel):
  - Messages arrive after delay ± jitter.
  - Two `RollbackSession`s joined by `DelayedLink` for 3,000 frames always have equal confirmed hashes.
- [ ] e2e test `e2e/hiz-testi.spec.ts`:
  - Two pages in one browser context open `/hiz-testi?gecikme=150&sure=10`.
  - After 10 s both show "SENKRON: AYNI".
  - A single page `/hiz-testi?sure=5` shows a verdict.
- [ ] Commit `feat(game): iki sekme gecikme testi`.

### Task 6: Menüden erişim ve teslim

- [ ] Main menu: ANTRENMAN stays "yakında". A small "HIZ TESTİ" chip in the bottom hint row opens `/hiz-testi`. The address is also given to Emir directly.
- [ ] Run lint, typecheck, test and e2e. Push. CI green. Preview smoke.
- [ ] Hand Emir the steps:
  1. Open the preview `/hiz-testi`.
  2. Press start.
  3. Wait 10 minutes without switching tabs.
  4. Send a photo of the result panel.
  5. Then open two tabs with `?gecikme=150` and confirm "AYNI".
