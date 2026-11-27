import { DOWN, HK, HP, LEFT, LK, LP, RIGHT, UP } from '@dovus/engine';

/** Dövüşte cihazdan girdi: klavye (Oyuncu 1 düzeni) ve PlayStation uyumlu oyun kolu (tarayıcı standart eşlemesi). */

export type Device = 'klavye' | `kol${number}`;

export const deviceName = (d: Device): string => (d === 'klavye' ? 'KLAVYE' : `KOL ${Number(d.slice(3)) + 1}`);
export const padDevice = (index: number): Device => `kol${index}`;
export const padIndex = (d: Device): number => (d === 'klavye' ? -1 : Number(d.slice(3)));

const KEYS: Record<string, number> = {
  KeyW: UP,
  ArrowUp: UP,
  KeyS: DOWN,
  ArrowDown: DOWN,
  KeyA: LEFT,
  ArrowLeft: LEFT,
  KeyD: RIGHT,
  ArrowRight: RIGHT,
  KeyU: LP,
  KeyJ: LK,
  KeyI: HP,
  KeyK: HK,
};

/** Oyunun kullandığı tuşlar (sayfa kaymasın, odak kaçmasın diye tarayıcıya gitmez). */
export const GAME_KEYS: ReadonlySet<string> = new Set([
  ...Object.keys(KEYS),
  'Enter',
  'Space',
  'Escape',
  'Backspace',
  'Tab',
]);

export function keyboardBits(down: ReadonlySet<string>): number {
  let bits = 0;
  for (const code of down) bits |= KEYS[code] ?? 0;
  return bits;
}

/** Gamepad'in kullandığımız kısmı (testte sahte kol verilebilsin diye). */
export interface PadLike {
  readonly buttons: ReadonlyArray<{ readonly pressed: boolean }>;
  readonly axes: ReadonlyArray<number>;
}

/** Standart eşleme: 0 ×, 1 ○, 2 □, 3 △, 9 Options, 12–15 yön tuşları. */
export const PAD = {
  CROSS: 0,
  CIRCLE: 1,
  SQUARE: 2,
  TRIANGLE: 3,
  OPTIONS: 9,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15,
} as const;
const STICK = 0.5;

const down = (p: PadLike, i: number): boolean => p.buttons[i]?.pressed === true;

export function padBits(p: PadLike): number {
  const [x = 0, y = 0] = p.axes;
  let bits = 0;
  if (down(p, PAD.UP) || y < -STICK) bits |= UP;
  if (down(p, PAD.DOWN) || y > STICK) bits |= DOWN;
  if (down(p, PAD.LEFT) || x < -STICK) bits |= LEFT;
  if (down(p, PAD.RIGHT) || x > STICK) bits |= RIGHT;
  if (down(p, PAD.SQUARE)) bits |= LP;
  if (down(p, PAD.CROSS)) bits |= LK;
  if (down(p, PAD.TRIANGLE)) bits |= HP;
  if (down(p, PAD.CIRCLE)) bits |= HK;
  return bits;
}

/** Bu karede yeni basılan tuşların numaraları. */
export function padEdges(prev: PadLike | undefined, now: PadLike): number[] {
  const out: number[] = [];
  now.buttons.forEach((b, i) => {
    if (b.pressed && !(prev && down(prev, i))) out.push(i);
  });
  return out;
}

export const padPressed = (prev: PadLike | undefined, now: PadLike, which: readonly number[]): boolean =>
  padEdges(prev, now).some((i) => which.includes(i));
