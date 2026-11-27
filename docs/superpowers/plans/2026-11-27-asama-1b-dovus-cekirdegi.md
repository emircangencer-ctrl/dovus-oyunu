# Aşama 1b — Dövüş çekirdeği ve yerel Versus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emir ana menüden VERSUS'a girer, aynı bilgisayarda biriyle (ya da ANTRENMAN'da kuklaya karşı) kutu dövüşçülerle 3 rauntluk tam maç oynar: yürüme, koşma, geri sıçrama, kısa/normal zıplama, çömelme, blok, 12 normal vuruş, kombo sayacı, raunt ve maç sonu, onaylı HUD.

**Architecture:**
- `@dovus/engine` genel katman kalır: sabit nokta, rng, hash, girdi bitleri, rastgele girdi, oyundan bağımsız `RollbackSession<S>`.
- Yeni `@dovus/fight` dövüş katmanı: veriyle tanımlı dövüşçü (`FighterDef`), saf `step(state, inputs)`, raunt/maç akışı. Bağımlılık yalnız fight → engine (spec 5.1, Emir kararı 7).
- `apps/game`: tek sayfalık ekran yöneticisi (tam ekran gezinmede düşmesin diye sayfa yenilenmez); katılma ekranı, dövüş ekranı (tuval: sahne + kutu dövüşçüler; DOM: onaylı HUD sınıfları `ds-health`, `ds-timer`, `ds-marks`, `ds-combo`, `ds-power`), duraklatma ve maç sonu.

**Tech Stack:** TypeScript 7, Vitest 5, Vite 8, Playwright. Yeni bağımlılık yok. Çizim bu alt planda Canvas 2D (kutular); PixiJS sprite'larla birlikte Aşama 1e'de gelir.

**Spec:** `docs/superpowers/specs/2026-11-24-dovus-oyunu-design.md` Bölüm 5.2, 5.4, 6.1, 6.5, 10, 11; Claude Docs tasarım dokümanı Bölüm 16 (dövüşçü boyu 160 px). Onaylı ekranlar: tasarım tuvali `Dovus`, `Duraklatma`, `RauntSonu`.

**Kapsam dışı (sonraki alt planlar):** 1c özel hareketler ve komut ayırıcı (↓↘→ vb.), mermi, güç göstergesi dolumu ve süper, fırlatma, yuvarlanma, blok iptali, geri itme vuruşu, Modern kontroller. 1d bilgisayar rakip, Arcade, karakter/sahne seçimi, VS ekranı, Ayarlar (tuş atama), ses. 1e sprite hattı, PixiJS, Canva AI prototip dövüşçüler ve sahne.

## Global Constraints

- Simülasyonda yalnız tam sayı; 1 piksel = 256 birim; `Math.random`, `Date`, `performance`, float trigonometri yasak; rastgelelik durumdaki xorshift32 ile.
- 60 Hz sabit adım; çizim ayrı ve durumu yalnız okur.
- Dövüşçü boyu 160 px (960×540 tabanında); sahne genişliği 1440 px (1,5 ekran); kamera yalnız kayar.
- Maç: 3 rauntta 2 galibiyet (ayarlanabilir), raunt süresi 99 saniye.
- Klavyede sol+sağ birlikte nötr; oyun kolu PlayStation standart eşlemesi: □ = Hafif Yumruk (A), × = Hafif Tekme (B), △ = Ağır Yumruk (C), ○ = Ağır Tekme (D); Options (9) = Duraklat.
- Klavye Oyuncu 1: WASD + U (A), J (B), I (C), K (D); Esc = Duraklat.
- Performans bütçesi korunur: adım %99,9 < 1 ms, 8 kare geri sarma < 4 ms (hız testi yeni çekirdekle ölçer).
- Arayüz yazıları Türkçe; yalnız onaylı kit sınıfları ve token renkleri.

## Review Focus

1. **Aynı karede iki vuruş (takas):** iki taraf da aynı karede isabet ederse ikisi de hasar alır; sıra oyuncu numarasına bağlı değildir.
2. **Köşede itme:** savunan sahne kenarında ya da ekran genişliği sınırındaysa geri itme saldırana aktarılır; dövüşçüler ekrandan taşmaz, iç içe geçmez.
3. **Vuruş donması sırasında basılan tuş:** donma bitince işlenir (zincir kaçmaz); donma sırasında hiçbir şey hareket etmez, süre de durur.
4. **Raunt sonu aynı anda nakavt / süre bitimi eşitlik:** ikisine de raunt yazılır; ikisi birden maçı alırsa maç berabere biter, oyun takılmaz.
5. **Sekme gizlenip dönünce:** dövüş döngüsü biriken zamanı tek seferde yüzlerce adımla oynamaz (en çok 250 ms birikir).

---

### Task 1: Genel motor ve dövüş katmanı ayrımı

**Files:** Create `packages/fight/{package.json,tsconfig.json,src/index.ts}`; move `packages/engine/src/sim.ts`, `sim.test.ts`, `determinism.test.ts` → `packages/fight/src/`; modify `packages/engine/src/rollback.ts`, `rollback.test.ts`, `index.ts`; `apps/game` imports; `vitest`/`tsconfig` project references as needed.

**Interfaces:**
- Produces (engine): `interface Game<S> { init(seed: number): S; step(s: S, inputs: readonly [number, number]): S; hash(s: S): number; frame(s: S): number }`; `class RollbackSession<S> { constructor(game: Game<S>, opts: RollbackOptions) … }` (same methods as 1a); `randomRewindRun<S>(game: Game<S>, seed: number, frames: number): { plain: number; rewound: number }`.
- Produces (fight): `fightGame: Game<SimState>` plus everything `sim.ts` exported.

- [ ] Engine rollback tests use a tiny counter game defined in the test (no fight import); fight gets `rollback.test.ts` running the 1a cases through `fightGame`.
- [ ] Golden determinism value unchanged (`3464579132`) — proves the move changed no behavior.
- [ ] `pnpm test`, `pnpm typecheck`, `pnpm lint`, e2e hız testi green. Commit.

### Task 2: Veriyle dövüşçü ve hareket

**Files:** Create `packages/fight/src/{types.ts,kukla.ts,stage.ts}`; rewrite `sim.ts` (state, step, hash); `movement.test.ts`.

**Interfaces (Produces):**
- `interface Box { x; y; w; h }` px, ayak ortasına göre, sağa bakarken; y yukarı negatif.
- `interface FighterDef { id; name; health; walkF; walkB; run; backdash: { frames; vx; decel; invuln }; jump: { prejump; vy; hopVy; vxF; vxB; gravity; land }; standHurt; crouchHurt; airHurt; pushHalf; attacks: AttackDef[]; normals: { st: [A,B,C,D]; cr: [...]; air: [...] } }` (hızlar fx).
- `interface FightOptions { seed; roundsToWin?; timerSeconds?; training?: boolean }`; `initialState(opts | seed)`; `step`; `hashState`; `hurtbox(f, def)`, `hitbox(f, def)` → world fx box or null; `cameraX(s)`.
- States: IDLE, WALK_F, WALK_B, CROUCH, PREJUMP, AIR, LANDING, RUN, BACKDASH, ATTACK, AIR_ATTACK, BLOCK_ST, BLOCK_CR, HIT_ST, HIT_CR, HIT_AIR, KNOCKDOWN, WAKEUP, KO, WIN.

- [ ] Tests (values from Kukla data): walk forward/back speed and direction relative to facing; crouch on any down; prejump 4 frames then normal jump if up held, hop if released (lower apex); jump direction 7/8/9; landing frames; 66 within 12 frames → RUN while forward held, release → IDLE; 44 → BACKDASH moves back with invuln frames; stage edges 40..1400; max separation 880 px; push boxes never overlap on ground; facing turns only in grounded neutral states; sol+sağ nötr.
- [ ] Implement; commit.

### Task 3: Vuruşlar, blok, sersemletme, kombo

**Files:** `packages/fight/src/{combat.ts,combat.test.ts}`, `kukla.ts` (12 normal), `sim.ts`.

**Interfaces (Produces):** `AttackDef { name; startup; active; recovery; damage; hitstun; blockstun; hitstop; push; guard: 'mid'|'low'|'over'; box: Box; chain?: boolean; knockdown?: boolean }`; fighter fields `combo`, `comboDamage`, `attackHit`; state `hitstop`, `spark: { x; y; frame; kind }`.

- [ ] Tests: each button × posture starts the mapped normal on press edge; hit lands on first active frame, once per attack; damage and hitstun applied; low must be crouch-blocked, over must be stand-blocked, mid either; holding back while not attacked just walks back; blockstun no damage; hitstop freezes both and the timer, presses during hitstop are buffered and start the chain after; light chains on contact only; trade on same frame; pushback moves defender, transfers to attacker at wall/max separation; air hit → HIT_AIR reset (land on feet, not hittable while falling); sweep knockdown → KNOCKDOWN then WAKEUP invulnerable; combo counter counts hits during hitstun and resets when stun ends; scaling 100,100,90,…,min 30 %; comboDamage sums.
- [ ] Implement; commit.

### Task 4: Raunt ve maç akışı; determinizm; hız testi yeni çekirdekte

**Files:** `packages/fight/src/{round.ts,round.test.ts}`, `determinism.test.ts`, `rollback.test.ts`; `apps/game/src/hiz-testi/{render.ts,index.ts,link-page.ts}`.

**Interfaces (Produces):** state `phase` (INTRO, FIGHT, ROUND_END, MATCH_END), `phaseFrame`, `round`, `timer` (frames), `wins: [a, b]`, `roundResult` (0 none, 1 P1, 2 P2, 3 draw) + `roundReason` (0 KO, 1 time), `winner` (-1 none, 0, 1, 2 draw); `INTRO_FRAMES = 100`, `ROUND_END_FRAMES = 150`.

- [ ] Tests: intro ignores input; timer counts down only in FIGHT and not during hitstop, `ceil(timer/60)` shown; KO ends round; timeout higher HP wins, equal = draw both get a mark; next round resets positions/HP/stun but keeps wins; match ends at roundsToWin; simultaneous = match draw; training option: time never runs out, HP refills when the combo ends, no KO.
- [ ] Determinism: 10.000 random matches; new golden value recorded (intentional change, ledger ruling). Random rewind 200 seeds equal to plain run.
- [ ] Speed-test and link pages run the new sim and draw with the new box helpers; e2e hız testi green.
- [ ] Commit.

### Task 5: Ekranlar — Versus, Antrenman, katılma, HUD, duraklatma, maç sonu

**Files:** Create `apps/game/src/screens/{manager.ts}`, `apps/game/src/dovus/{controls.ts,controls.test.ts,join.ts,join-state.ts,join-state.test.ts,screen.ts,hud.ts,render.ts,pause-state.ts,pause-state.test.ts}`; modify `menu/menu-state.ts` (VERSUS, ANTRENMAN ready; `launch`), `menu/start.ts`, `main.ts`, `style.css`; `e2e/dovus.spec.ts`.

**Interfaces (Produces):** `showScreen(name: 'menu'|'versus'|'antrenman', ctx)`; `readControls(kb: KeyState, pads: readonly (Gamepad|null)[], device: Device): number` (engine input bits); join state machine: devices press to claim P1 then P2; Versus needs two, Antrenman one (P2 = kukla); Enter/Options with one player in Versus → P2 kukla.

- [ ] Unit tests: keyboard mapping incl. sol+sağ nötr, PlayStation mapping, join state (claim, cancel with back, start rules), pause state (Devam / Ana menüye dön; Esc/Options toggles).
- [ ] Fight screen: fixed-step loop (250 ms clamp), canvas render with camera (stage bands, floor line, boxes colored by player, hit sparks; Antrenman shows hurt/hit boxes), DOM HUD per approved mockup (portrait frames empty for now, names OYUNCU 1 / OYUNCU 2 or KUKLA, health with trail, timer, round marks, combo "n VURUŞ" + "%x hasar", power stocks shown empty), announcements (RAUNT n, DÖVÜŞ!, K.O., SÜRE BİTTİ, BERABERE), match end panel (kazanan, RÖVANŞ, ANA MENÜ).
- [ ] e2e: menu → VERSUS → join with keyboard (+Enter for kukla) → HUD visible → P1 walks in and wins 2 rounds with heavy punches → match panel → ANA MENÜ; ANTRENMAN opens with boxes visible and timer "∞"; pause Esc → ANA MENÜYE DÖN.
- [ ] All suites green; commit.

### Task 6: Yayın ve Emir'in Chrome'unda deneme

- [ ] Push, CI, preview deploy, smoke dispatch with expected version.
- [ ] In Emir's Chrome: play a short Versus vs kukla via extension (screenshots), run hız testi once more on new sim (5 min is enough to see step time; full 10 min only if Emir is away).
- [ ] Ledger, handover message in plain Turkish with step-by-step what to try.
