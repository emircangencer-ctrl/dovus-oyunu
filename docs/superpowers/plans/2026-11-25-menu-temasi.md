# Menü teması ve canlı başlık/ana menü — uygulama planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turnuva görseli temasında piksel arayüz kiti, 16 ekranın bu temayla yeniden çizimi ve canlı sitede başlık → ana menü.

**Architecture:**
- Canva AI'dan gelen iki görsel `apps/game/public/art/` altına işlenmiş hâliyle girer:
  - `menu-bg.webp`: 1920×1080.
  - `logo.webp`: saydam zeminli.
- Arayüz kiti `tools/ui-kit/` içindeki Python üreticisiyle `apps/game/src/ui/kit.css` olarak üretilir:
  - Çerçeveler 9 dilimli piksel SVG.
  - Parıltı basamaklı `box-shadow` halkalarıyla verilir.
- Canlı menü saf bir durum makinesi (`menu-state.ts`), girdi eşlemesi (`input.ts`) ve DOM görünümünden (`view.ts`) oluşur. Görünüm 1920×1080 sahnede çizilir, tuvalle aynı tam sayı katla ölçeklenir.

**Tech Stack:** TypeScript 7, Vite 8, Vitest 5, Playwright, Python 3 (kit üreticisi, yalnız standart kütüphane).

**Spec:** `docs/superpowers/specs/2026-11-25-menu-temasi-design.md`

## Global Constraints

- Yazı tipi yalnız Jersey 10; boylar `tools/fonts/pixel-grid.test.ts` ızgarasına oturur.
- Arayüz yazıları Türkçe.
- 960×540 taban, 1920 çerçevede 1 taban pikseli = 2 CSS pikseli.
- Duman testi `data-testid="surum"` satırını okur; bu satır başlık ekranında kalır.
- Sanat görselleri Canva AI'dan: arka plan `MAHb3WLMCug`, logo `MAHb3eS2Td4` (kesilmiş).

## Review Focus

1. Klavye odağı sayfa açılınca oyunda olmalı. Tıklamadan Enter çalışmalı.
2. Oyun kolu bağlıyken bir tuşa basılı tutmak menüyü kare başına kaydırmamalı. Tekrar, gecikmeli olmalı.
3. Pencere 1366×768 iken menü tamamen görünür ve ortalı olmalı.
4. "Yakında" bildirimi üst üste basınca birikmemeli. Tek bildirim yenilenir.
5. Fareyle bir seçeneğin üzerine gelmek odağı oraya taşımalı. Tıklamak seçmeli.

---

### Task 1: Sanat dosyaları

**Files:**
- Create: `apps/game/public/art/menu-bg.webp`
- Create: `apps/game/public/art/logo.webp`
- Create: `tools/art/prepare.py`
- Test: `apps/game/src/art/art.test.ts`

**Interfaces:**
- Produces: `/art/menu-bg.webp` (1920×1080), `/art/logo.webp` (saydam).

- [ ] Write `art.test.ts`. Read the WebP headers and assert:
  - `menu-bg.webp` is 1920×1080.
  - `logo.webp` is VP8X with the alpha flag set and is at most 1400 px wide.
- [ ] Run `pnpm vitest run apps/game/src/art`. Expected: FAIL (files missing).
- [ ] `tools/art/prepare.py` does three things:
  - Scale the background to 1920 wide and crop it to 1080.
  - Cut the logo out with GrabCut (strip the empty ribbon below it).
  - Write both files as WebP.
- [ ] Run the test again. Expected: PASS.
- [ ] Commit `feat(art): menü arka planı ve logo`.

### Task 2: Arayüz kiti ve tema token'ları

**Files:**
- Modify: `apps/game/src/ui/tokens.json` (sky, navy, steel, bronze, cyan, green, red, gem colors)
- Create: `tools/ui-kit/kit.py`
- Create: `apps/game/src/ui/kit.css` (generated)
- Test: `tools/ui-kit/kit.test.ts`

- [ ] Write `kit.test.ts`. Assert:
  - Every `var(--x)` in `kit.css` is defined in tokens.json or in the kit's own `:root`.
  - Each required class exists: `ds-btn`, `ds-btn--go`, `ds-btn--danger`, `ds-panel`, `ds-plate`, `ds-ribbon`, `ds-match`, `ds-table`, `ds-hints`, `ds-menu-item`, `ds-toast`.
- [ ] Run it. Expected: FAIL.
- [ ] Write `kit.py` (frames, gems, icons) and generate `kit.css`. Add the new tokens, each with usage notes and contrast pairs.
- [ ] Run tools tests. Expected: PASS. The contrast tests stay green.
- [ ] Commit `feat(ui): kale teması arayüz kiti`.

### Task 3: 16 ekranın yeniden çizimi (tasarım tuvali) ve tasarım sistemi

- [ ] Build `game-ui.css` from `kit.css` plus the board helpers.
- [ ] Upload the background and logo as assets.
- [ ] Rework the boards: menu screens on the castle background, screen titles as ribbons, main menu as buttons.
- [ ] Screenshot every board and check: no overflow, no overlaps, text readable.
- [ ] Publish the canvas. Update the design system artifact (tokens, bundle, README, cover); the index goes last.

### Task 4: Canlı başlık ve ana menü

**Files:**
- Create: `apps/game/src/menu/menu-state.ts`, `menu-state.test.ts`
- Create: `apps/game/src/menu/input.ts`, `input.test.ts`
- Create: `apps/game/src/menu/view.ts`
- Modify: `apps/game/src/main.ts`, `apps/game/index.html`
- Test: `e2e/menu.spec.ts`; `e2e/shell.spec.ts` unchanged and still green.

**Interfaces:**
- `type Screen = 'baslik' | 'menu'`
- `type MenuAction = 'yukari' | 'asagi' | 'sec' | 'geri' | 'herhangi' | { odak: number } | { tikla: number }`
- `interface MenuState { screen: Screen; focus: number; toast: { text: string; id: number } | null }`
- `step(state: MenuState, action: MenuAction): MenuState`
- `MENU_ITEMS: readonly { id: string; label: string; ready: boolean; soon?: boolean }[]` (8 items, spec order)
- `keyToAction(key: string): MenuAction | null`
- `padRepeat(prev: PadSnapshot, now: PadSnapshot, t: number): MenuAction[]`: first press immediate, repeat after 300 ms, then every 120 ms.

- [ ] Unit tests for `step`:
  - Any input on the title screen opens the menu.
  - Moving down from the last item wraps to the top.
  - Selecting an item that isn't ready sets the toast "YAKINDA" with a fresh id.
  - Back from the menu returns to the title screen.
  - Hovering an item moves the focus to it.
- [ ] Unit tests for `keyToAction` (arrows, WASD, Enter, Space, Escape) and for `padRepeat`.
- [ ] Watch them fail, implement, watch them pass.
- [ ] Write `view.ts`:
  - Render the stage at 1920×1080 with the kit classes.
  - Scale it with `computeScale(...).scale / 2`.
  - Show the version line on the title screen.
- [ ] Write `e2e/menu.spec.ts` covering:
  - The title screen is visible.
  - Enter shows the menu with 8 items.
  - ArrowDown moves the focus.
  - Enter shows "YAKINDA".
  - Escape returns to the title screen.
  - At 1366×768 the stage is inside the viewport.
- [ ] Run `pnpm lint && pnpm typecheck && pnpm test && pnpm e2e --project=chromium`. Expected: all PASS.
- [ ] Commit `feat(game): kale temalı başlık ekranı ve ana menü`.

### Task 5: Yayın kontrolü

- [ ] Push. Wait for CI. Run the preview smoke test with the new version.
- [ ] Screenshot the live preview at 1366×768 and 1920×1080.
- [ ] Report to Emir.
