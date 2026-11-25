import type { MenuAction } from './menu-state';

/** Klavye tuşunu menü eylemine çevirir. Değiştirici ve sistem tuşları yok sayılır (null). */
export function keyToAction(key: string): MenuAction | null {
  switch (key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      return 'yukari';
    case 'ArrowDown':
    case 's':
    case 'S':
      return 'asagi';
    case 'Enter':
    case ' ':
      return 'sec';
    case 'Escape':
    case 'Backspace':
      return 'geri';
    case 'Shift':
    case 'Control':
    case 'Alt':
    case 'AltGraph':
    case 'Meta':
    case 'Tab':
    case 'CapsLock':
      return null;
  }
  if (/^F\d{1,2}$/.test(key)) return null;
  return 'herhangi';
}

export interface PadSnapshot {
  readonly up: boolean;
  readonly down: boolean;
  readonly a: boolean;
  readonly b: boolean;
  readonly start: boolean;
  /** Yukarıdakiler dışındaki herhangi bir tuş. */
  readonly other: boolean;
}

export const NO_PAD: PadSnapshot = { up: false, down: false, a: false, b: false, start: false, other: false };

export interface PadMemory {
  readonly prev: PadSnapshot;
  /** Basılı tutulan yön için bir sonraki tekrar anı (ms); basılı değilse null. */
  readonly next: { readonly up: number | null; readonly down: number | null };
}

const FIRST_REPEAT_MS = 300;
const REPEAT_MS = 120;

/** Oyun kolu durumunu kare kare okur: basış anında bir eylem, basılı tutulan yön önce 300 ms sonra, sonra her 120 ms'de tekrarlar. */
export function padStep(
  mem: PadMemory | undefined,
  now: PadSnapshot,
  t: number,
): { mem: PadMemory; actions: MenuAction[] } {
  const prev = mem?.prev ?? NO_PAD;
  const next = { up: mem?.next.up ?? null, down: mem?.next.down ?? null };
  const actions: MenuAction[] = [];

  for (const dir of ['up', 'down'] as const) {
    const action = dir === 'up' ? 'yukari' : 'asagi';
    if (!now[dir]) {
      next[dir] = null;
    } else if (!prev[dir]) {
      actions.push(action);
      next[dir] = t + FIRST_REPEAT_MS;
    } else if (next[dir] !== null && t >= next[dir]) {
      actions.push(action);
      next[dir] += REPEAT_MS;
    }
  }
  if (now.a && !prev.a) actions.push('sec');
  if (now.b && !prev.b) actions.push('geri');
  if (now.start && !prev.start) actions.push('sec');
  if (now.other && !prev.other) actions.push('herhangi');

  return { mem: { prev: now, next }, actions };
}

/** Standart eşlemeli oyun kollarını tek bir anlık duruma birleştirir (D-pad, sol çubuk, A, B, Start). */
export function readPads(pads: readonly (Gamepad | null)[]): PadSnapshot {
  let snap = NO_PAD;
  for (const gp of pads) {
    if (!gp?.connected) continue;
    const pressed = (i: number): boolean => gp.buttons[i]?.pressed ?? false;
    const stickY = gp.axes[1] ?? 0;
    const known = new Set([0, 1, 9, 12, 13]);
    snap = {
      up: snap.up || pressed(12) || stickY < -0.5,
      down: snap.down || pressed(13) || stickY > 0.5,
      a: snap.a || pressed(0),
      b: snap.b || pressed(1),
      start: snap.start || pressed(9),
      other: snap.other || gp.buttons.some((btn, i) => btn.pressed && !known.has(i)),
    };
  }
  return snap;
}
