import { type FightState, initialState, PHASE, step } from '@dovus/fight';
import type { Screen, ScreenCtx } from '../screens/manager';
import { el, setText } from '../ui/dom';
import {
  type Device,
  deviceName,
  GAME_KEYS,
  keyboardBits,
  PAD,
  type PadLike,
  padBits,
  padDevice,
  padEdges,
  padIndex,
} from './controls';
import { createHud, type HudNames } from './hud';
import { type JoinState, joinStart, joinStep, type Mode, type Seat } from './join-state';
import { type ListAction, type ListMenu, listMenu, listStep } from './list-menu';
import { drawFight, readFightPalette } from './render';

/** Versus ve Antrenman ekranı: katılma → dövüş (60 Hz sabit adım) → duraklatma / maç sonu. */

const FRAME_MS = 1000 / 60;
/** Sekme gizlenip dönünce en çok bu kadar zaman yetiştirilir (yüzlerce adım birden oynanmaz). */
const MAX_CATCHUP_MS = 250;
/** Maç bittikten sonra menünün açılması (sim karesi) ve onayın kabulü (çizim karesi) için bekleme: vuruş tuşuna
 *  basmaya devam eden oyuncu yanlışlıkla seçim yapmasın. */
const END_MENU_AFTER = 90;
const MENU_ARM_FRAMES = 20;

const PAUSE_ITEMS = ['DEVAM ET', 'BAŞTAN BAŞLA', 'ANA MENÜYE DÖN'] as const;
/** Katılma ekranında klavyeden "bir tuşa bas": vuruş tuşları ve boşluk. */
const JOIN_KEYS: ReadonlySet<string> = new Set(['KeyU', 'KeyJ', 'KeyI', 'KeyK', 'Space']);
const END_ITEMS = ['RÖVANŞ', 'ANA MENÜYE DÖN'] as const;

type Phase = 'katil' | 'dovus' | 'durak' | 'son';

interface DeviceEvents {
  readonly dev: Device;
  readonly join: boolean;
  readonly confirm: boolean;
  readonly back: boolean;
  readonly pause: boolean;
  readonly nav: readonly ('yukari' | 'asagi' | 'sec' | 'geri')[];
}

const snapPad = (p: Gamepad): PadLike => ({
  buttons: p.buttons.map((b) => ({ pressed: b.pressed })),
  axes: [...p.axes],
});

export function createFightScreen(ctx: ScreenCtx, mode: Mode): Screen {
  const off = new AbortController();
  const training = mode === 'antrenman';
  const canvas = ctx.canvas.getContext('2d');
  if (!canvas) throw new Error('Tuval çizim bağlamı alınamadı');
  const palette = readFightPalette();

  // ---- Sahne ve görünüm ----
  const stage = el('div', { class: `sahne dovus dovus--${mode}`, 'data-testid': 'dovus' });
  const hud = createHud(stage);
  hud.root.hidden = true;

  const join = el('section', {
    class: 'ds-panel ds-panel--ribbon katil',
    'data-testid': 'katil',
    'aria-label': 'Oyuncu seçimi',
  });
  join.append(el('span', { class: 'ds-ribbon' }, training ? 'ANTRENMAN' : 'VERSUS'));
  const seats = el('div', { class: 'katil__koltuklar' });
  const seatEls = ([1, 2] as const).map((p) => {
    const box = el('div', { class: `katil__koltuk katil__koltuk--p${p}` });
    const label = el(
      'span',
      { class: `ds-plate katil__oyuncu katil__oyuncu--p${p}` },
      p === 1 ? 'OYUNCU 1' : training ? 'RAKİP' : 'OYUNCU 2',
    );
    const status = el('span', { class: 'katil__durum', 'data-testid': `koltuk-p${p}` });
    box.append(label, status);
    seats.append(box);
    return status;
  });
  const joinHelp = el('p', { class: 'katil__yardim', 'data-testid': 'katil-yardim' });
  const keysHelp = el('p', { class: 'katil__tuslar' });
  keysHelp.innerHTML =
    '<span class="key">W</span><span class="key">A</span><span class="key">S</span><span class="key">D</span> hareket · ' +
    '<span class="key">U</span><span class="key">J</span><span class="key">I</span><span class="key">K</span> vuruş' +
    '<br>Kol: yön + <span class="key">□</span><span class="key">×</span><span class="key">△</span><span class="key">○</span>';
  join.append(seats, joinHelp, keysHelp);

  const menuOverlay = (testid: string, title: string): { root: HTMLElement; note: HTMLElement; list: HTMLElement } => {
    const root = el('div', { class: `dovus__katman ${testid}`, 'data-testid': testid });
    const panel = el('section', { class: 'ds-panel dovus__menu-panel' });
    const note = el('p', { class: 'note dovus__not' });
    const list = el('div', { class: 'ds-menu dovus__menu' });
    if (title) panel.append(el('h1', { class: 'dovus__baslik' }, title));
    panel.append(note, list);
    root.append(panel);
    root.hidden = true;
    return { root, note, list };
  };
  const pauseUi = menuOverlay('durak', 'DURAKLATILDI');
  const endUi = menuOverlay('son', '');
  endUi.root.classList.add('dovus__katman--son');

  const hints = el('div', { class: 'ds-hints alt-serit' });
  const hintText = el('span', { class: 'ipucu' });
  hints.append(hintText);
  stage.append(join, pauseUi.root, endUi.root, hints);
  ctx.ui.append(stage);

  // ---- Durum ----
  let phase: Phase = 'katil';
  let seatsState: JoinState = joinStart(mode);
  let sim: FightState = newMatch();
  let names: HudNames = { p1: 'OYUNCU 1', p2: 'OYUNCU 2' };
  let menu: ListMenu = listMenu(PAUSE_ITEMS);
  let menuArmed = 0;
  let pausedBy = 1;

  function newMatch(): FightState {
    return initialState({ seed: 1, training, intro: !training });
  }

  // ---- Girdi ----
  const kbDown = new Set<string>();
  let kbEdges: string[] = [];
  let kbNav: string[] = [];
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      if (!e.repeat) {
        kbDown.add(e.code);
        kbEdges.push(e.code);
      }
      kbNav.push(e.code);
    },
    { signal: off.signal },
  );
  window.addEventListener('keyup', (e) => kbDown.delete(e.code), { signal: off.signal });
  window.addEventListener('blur', () => kbDown.clear(), { signal: off.signal });
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden && phase === 'dovus') openPause(1);
    },
    { signal: off.signal },
  );

  let padPrev: (PadLike | undefined)[] = [];
  let padNow: (PadLike | undefined)[] = [];

  function readPadsNow(): void {
    padPrev = padNow;
    padNow = Array.from(navigator.getGamepads?.() ?? [], (p) => (p?.connected ? snapPad(p) : undefined));
  }

  function events(): DeviceEvents[] {
    const out: DeviceEvents[] = [];
    const has = (list: readonly string[], ...codes: string[]): boolean => list.some((c) => codes.includes(c));
    const kbNavActions = kbNav.flatMap((c): ('yukari' | 'asagi' | 'sec' | 'geri')[] => {
      if (c === 'ArrowUp' || c === 'KeyW') return ['yukari'];
      if (c === 'ArrowDown' || c === 'KeyS') return ['asagi'];
      if (c === 'Enter' || c === 'Space') return ['sec'];
      if (c === 'Escape' || c === 'Backspace') return ['geri'];
      return [];
    });
    out.push({
      dev: 'klavye',
      join: has(kbEdges, 'KeyU', 'KeyJ', 'KeyI', 'KeyK', 'Space'),
      confirm: has(kbEdges, 'Enter'),
      back: has(kbEdges, 'Escape', 'Backspace'),
      pause: has(kbEdges, 'Escape'),
      nav: kbNavActions,
    });
    padNow.forEach((now, i) => {
      if (!now) return;
      const prev = padPrev[i];
      const edges = padEdges(prev, now);
      const dirsNow = padBits(now);
      const dirsPrev = prev ? padBits(prev) : 0;
      const nav: ('yukari' | 'asagi' | 'sec' | 'geri')[] = [];
      if (dirsNow & 1 && !(dirsPrev & 1)) nav.push('yukari');
      if (dirsNow & 2 && !(dirsPrev & 2)) nav.push('asagi');
      if (edges.includes(PAD.CROSS)) nav.push('sec');
      if (edges.includes(PAD.CIRCLE) || edges.includes(PAD.OPTIONS)) nav.push('geri');
      out.push({
        dev: padDevice(i),
        join: edges.some((b) => b <= 3),
        confirm: edges.includes(PAD.OPTIONS),
        back: edges.includes(8),
        pause: edges.includes(PAD.OPTIONS),
        nav,
      });
    });
    return out;
  }

  const bitsOf = (seat: Seat | null): number => {
    if (seat === null || seat === 'kukla') return 0;
    // Bu karede basılıp bırakılan tuş da sayılır (çok kısa dokunuş kaybolmasın).
    if (seat === 'klavye') return keyboardBits(kbEdges.length ? new Set([...kbDown, ...kbEdges]) : kbDown);
    const pad = padNow[padIndex(seat)];
    return pad ? padBits(pad) : 0;
  };
  const joined = (d: Device): boolean => seatsState.p1 === d || seatsState.p2 === d;

  // ---- Akış ----
  function renderJoin(): void {
    const show = (seat: Seat | null): string =>
      seat === null ? 'BİR TUŞA BAS' : seat === 'kukla' ? 'KUKLA' : deviceName(seat);
    setText(seatEls[0] as HTMLElement, show(seatsState.p1));
    setText(seatEls[1] as HTMLElement, training ? 'KUKLA' : show(seatsState.p2));
    (seatEls[0] as HTMLElement).classList.toggle('is-on', seatsState.p1 !== null);
    (seatEls[1] as HTMLElement).classList.toggle('is-on', seatsState.p2 !== null || training);
    setText(
      joinHelp,
      seatsState.p1 === null
        ? 'Klavyede ya da kolda bir vuruş tuşuna bas.'
        : 'Oyuncu 2: başka bir cihazdan bir tuşa bas · Oyuncu 1 Enter / Options: kuklaya karşı',
    );
    hintText.innerHTML = '<span class="key">Esc</span>Geri';
  }

  function beginFight(): void {
    phase = 'dovus';
    sim = newMatch();
    names = { p1: 'OYUNCU 1', p2: seatsState.p2 === 'kukla' ? 'KUKLA' : 'OYUNCU 2' };
    join.hidden = true;
    hud.root.hidden = false;
    hints.hidden = true;
    acc = 0;
    last = 0;
  }

  function renderMenu(target: { list: HTMLElement }, items: readonly string[]): void {
    target.list.replaceChildren(
      ...items.map((label, i) => {
        const b = el('button', {
          type: 'button',
          tabindex: '-1',
          class: `ds-menu-item${i === menu.focus ? ' is-focused' : ''}`,
          'data-testid': 'dovus-secenek',
        });
        b.textContent = label;
        if (i === menu.focus) b.setAttribute('aria-current', 'true');
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('pointerenter', () => menuAction({ odak: i }));
        b.addEventListener('click', () => menuAction({ tikla: i }));
        return b;
      }),
    );
  }

  function openPause(who: number): void {
    phase = 'durak';
    pausedBy = who;
    menu = listMenu(PAUSE_ITEMS);
    menuArmed = MENU_ARM_FRAMES;
    setText(pauseUi.note, `Oyuncu ${pausedBy} durdurdu`);
    renderMenu(pauseUi, PAUSE_ITEMS);
    pauseUi.root.hidden = false;
    hints.hidden = false;
    hintText.innerHTML =
      '<span class="key"><i class="ico ico-up"></i><i class="ico ico-down"></i></span>Seç <span class="key">Enter</span><span class="key">×</span>Onayla <span class="key">Esc</span><span class="key">○</span>Devam';
  }

  function openEnd(): void {
    phase = 'son';
    menu = listMenu(END_ITEMS);
    menuArmed = MENU_ARM_FRAMES;
    setText(endUi.note, '');
    renderMenu(endUi, END_ITEMS);
    endUi.root.hidden = false;
    hints.hidden = false;
    hintText.innerHTML =
      '<span class="key"><i class="ico ico-up"></i><i class="ico ico-down"></i></span>Seç <span class="key">Enter</span><span class="key">×</span>Onayla';
  }

  function closeOverlays(): void {
    pauseUi.root.hidden = true;
    endUi.root.hidden = true;
    hints.hidden = true;
  }

  function menuAction(a: ListAction): void {
    if (stopped || (phase !== 'durak' && phase !== 'son')) return;
    const items = phase === 'durak' ? PAUSE_ITEMS : END_ITEMS;
    const isConfirm = a === 'sec' || (typeof a === 'object' && 'tikla' in a);
    if (isConfirm && menuArmed > 0 && typeof a !== 'object') return;
    const r = listStep(menu, a);
    menu = r.menu;
    renderMenu(phase === 'durak' ? pauseUi : endUi, items);
    if (phase === 'durak' && r.back) {
      phase = 'dovus';
      closeOverlays();
      return;
    }
    if (r.chosen === undefined) return;
    const label = items[r.chosen];
    if (label === 'DEVAM ET') {
      phase = 'dovus';
      closeOverlays();
    } else if (label === 'BAŞTAN BAŞLA' || label === 'RÖVANŞ') {
      closeOverlays();
      beginFight();
    } else if (label === 'ANA MENÜYE DÖN') {
      ctx.go({ name: 'menu', at: mode });
    }
  }

  // ---- Döngü ----
  let acc = 0;
  let last = 0;
  let raf = 0;
  let stopped = false;

  function frame(t: number): void {
    readPadsNow();
    const evs = events();
    if (menuArmed > 0) menuArmed -= 1;

    if (phase === 'katil') {
      // Klavyede aynı karede birden çok basış olabilir (hızlı Enter, Enter): her biri sırayla işlenir.
      for (const code of kbEdges) {
        if (code === 'Escape' || code === 'Backspace') seatsState = joinStep(seatsState, { geri: 'klavye' });
        else if (code === 'Enter') seatsState = joinStep(seatsState, { onay: 'klavye' });
        else if (JOIN_KEYS.has(code)) seatsState = joinStep(seatsState, { bas: 'klavye' });
      }
      for (const e of evs) {
        if (e.dev === 'klavye') continue;
        if (e.back) seatsState = joinStep(seatsState, { geri: e.dev });
        else if (e.join) seatsState = joinStep(seatsState, { bas: e.dev });
        if (e.confirm) seatsState = joinStep(seatsState, { onay: e.dev });
      }
      if (seatsState.exit) {
        ctx.go({ name: 'menu', at: mode });
        return;
      }
      renderJoin();
      if (seatsState.ready) beginFight();
    } else if (phase === 'dovus') {
      const pauser = evs.find((e) => e.pause && joined(e.dev));
      if (pauser) openPause(seatsState.p1 === pauser.dev ? 1 : 2);
      else {
        if (last !== 0) acc += Math.min(t - last, MAX_CATCHUP_MS);
        const inputs: [number, number] = [bitsOf(seatsState.p1), bitsOf(seatsState.p2)];
        while (acc >= FRAME_MS) {
          sim = step(sim, inputs);
          acc -= FRAME_MS;
        }
        if (!training && sim.phase === PHASE.MATCH_END && sim.phaseFrame >= END_MENU_AFTER) openEnd();
      }
    } else {
      for (const e of evs) {
        if (!joined(e.dev)) continue;
        for (const a of e.nav) {
          if (phase !== 'durak' && phase !== 'son') break;
          menuAction(a);
        }
      }
    }
    if (stopped) return;
    stage.classList.toggle('is-menu', phase === 'durak' || phase === 'son');
    last = phase === 'dovus' ? t : 0;
    kbEdges = [];
    kbNav = [];

    if (phase !== 'katil') {
      drawFight(canvas as CanvasRenderingContext2D, sim, palette, training);
      hud.update(sim, names);
    } else {
      drawFight(canvas as CanvasRenderingContext2D, sim, palette, false);
    }
    raf = requestAnimationFrame(frame);
  }

  renderJoin();
  raf = requestAnimationFrame(frame);

  // Uçtan uca testler ve hata bildirimi için okunabilir özet.
  (window as unknown as { __dovus?: () => unknown }).__dovus = () => ({
    ekran: phase,
    evre: sim.phase,
    raunt: sim.round,
    can: [sim.fighters[0].hp, sim.fighters[1].hp],
    galibiyet: sim.wins,
    kazanan: sim.winner,
    sure: sim.timer,
  });

  return {
    stage,
    stop() {
      stopped = true;
      off.abort();
      cancelAnimationFrame(raf);
      delete (window as unknown as { __dovus?: unknown }).__dovus;
    },
  };
}
