import { toFx } from './fixed';
import { hashInts } from './hash';
import { cleanInput, HP, LEFT, LP, RIGHT, UP } from './input';

/** Kutu dövüşçülerle deterministik simülasyon (Aşama 1a teknik kanıt). Yalnız tam sayı; 60 Hz sabit adım.
 *  Sayılar başlangıç değerleridir; Aşama 1'de oyun hissine göre ayarlanır. */

export const FLOOR_Y = 440;
export const FIGHTER_W = 60;
export const FIGHTER_H = 160;
const STAGE_LEFT = 30;
const STAGE_RIGHT = 930;
const WALK = toFx(3);
const JUMP_VY = toFx(-14);
const GRAVITY = 192; // 0.75 taban pikseli / kare²
const PUSHBACK = toFx(2);
const MAX_HP = 1000;

export const IDLE = 0;
export const WALKING = 1;
export const JUMPING = 2;
export const ATTACKING = 3;
export const HITSTUN = 4;
export const KO = 5;
export type FighterState =
  | typeof IDLE
  | typeof WALKING
  | typeof JUMPING
  | typeof ATTACKING
  | typeof HITSTUN
  | typeof KO;

interface AttackData {
  readonly startup: number;
  readonly active: number;
  readonly recovery: number;
  readonly damage: number;
  readonly hitstun: number;
}
/** 1 = hafif yumruk, 2 = ağır yumruk. */
const ATTACKS: Record<number, AttackData> = {
  1: { startup: 4, active: 3, recovery: 8, damage: 50, hitstun: 14 },
  2: { startup: 8, active: 4, recovery: 18, damage: 100, hitstun: 20 },
};

export interface Fighter {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly facing: 1 | -1;
  readonly hp: number;
  readonly state: FighterState;
  readonly stateFrame: number;
  readonly hitstun: number;
  readonly attack: number;
  readonly hitDone: number;
  readonly prevInput: number;
}

export interface SimState {
  readonly frame: number;
  readonly fighters: readonly [Fighter, Fighter];
  readonly rngSeed: number;
}

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const newFighter = (xPx: number, facing: 1 | -1): Fighter => ({
  x: toFx(xPx),
  y: toFx(FLOOR_Y),
  vx: 0,
  vy: 0,
  facing,
  hp: MAX_HP,
  state: IDLE,
  stateFrame: 0,
  hitstun: 0,
  attack: 0,
  hitDone: 0,
  prevInput: 0,
});

export function initialState(seed: number): SimState {
  return { frame: 0, fighters: [newFighter(300, 1), newFighter(660, -1)], rngSeed: seed >>> 0 };
}

const MIN_X = toFx(STAGE_LEFT + FIGHTER_W / 2);
const MAX_X = toFx(STAGE_RIGHT - FIGHTER_W / 2);
const clampX = (x: number): number => Math.min(Math.max(x, MIN_X), MAX_X);

/** Hasar alan kutu (gövde) ve etkin karelerde vuran kutu; birimler sabit nokta, y aşağı doğru artar. */
export function boxes(f: Fighter): { hurt: Box; hit: Box | null } {
  const hurt = { x: f.x - toFx(FIGHTER_W / 2), y: f.y - toFx(FIGHTER_H), w: toFx(FIGHTER_W), h: toFx(FIGHTER_H) };
  const data = ATTACKS[f.attack];
  if (f.state !== ATTACKING || !data || f.stateFrame < data.startup || f.stateFrame >= data.startup + data.active) {
    return { hurt, hit: null };
  }
  const w = toFx(50);
  const x = f.facing === 1 ? f.x + toFx(FIGHTER_W / 2) : f.x - toFx(FIGHTER_W / 2) - w;
  return { hurt, hit: { x, y: f.y - toFx(120), w, h: toFx(20) } };
}

const overlaps = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

function control(src: Fighter, raw: number): Mutable<Fighter> {
  const f: Mutable<Fighter> = { ...src };
  const input = cleanInput(raw);
  const pressed = input & ~src.prevInput;
  const grounded = src.y >= toFx(FLOOR_Y);
  const dirX = input & RIGHT ? 1 : input & LEFT ? -1 : 0;

  if (f.state === KO) {
    f.vx = 0;
  } else if (f.hitstun > 0) {
    f.hitstun -= 1;
    f.vx = (f.vx * 3) >> 2;
    if (f.hitstun === 0) {
      f.state = IDLE;
      f.vx = 0;
    }
  } else if (f.state === ATTACKING) {
    f.stateFrame += 1;
    f.vx = 0;
    const data = ATTACKS[f.attack];
    if (!data || f.stateFrame >= data.startup + data.active + data.recovery) {
      f.state = IDLE;
      f.attack = 0;
      f.stateFrame = 0;
    }
  } else if (grounded) {
    if (pressed & (LP | HP)) {
      f.state = ATTACKING;
      f.attack = pressed & LP ? 1 : 2;
      f.stateFrame = 0;
      f.hitDone = 0;
      f.vx = 0;
    } else if (input & UP) {
      f.state = JUMPING;
      f.vy = JUMP_VY;
      f.vx = dirX * WALK;
    } else if (dirX !== 0) {
      f.state = WALKING;
      f.vx = dirX * WALK;
    } else {
      f.state = IDLE;
      f.vx = 0;
    }
  }

  // Fizik: zıplama karesinde hemen yükselir, sonra yerçekimi eklenir.
  if (f.y < toFx(FLOOR_Y) || f.vy < 0) {
    if (!(f.state === JUMPING && f.vy === JUMP_VY && grounded)) f.vy += GRAVITY;
    f.y += f.vy;
    if (f.y >= toFx(FLOOR_Y)) {
      f.y = toFx(FLOOR_Y);
      f.vy = 0;
      if (f.state === JUMPING) f.state = IDLE;
    }
  }
  f.x = clampX(f.x + f.vx);
  f.prevInput = input;
  return f;
}

function separate(a: Mutable<Fighter>, b: Mutable<Fighter>): void {
  const w = toFx(FIGHTER_W);
  const dx = b.x - a.x;
  if (Math.abs(dx) >= w || Math.abs(a.y - b.y) >= toFx(FIGHTER_H)) return;
  const sign = dx >= 0 ? 1 : -1;
  const overlap = w - Math.abs(dx);
  const half = overlap >> 1;
  a.x = clampX(a.x - sign * half);
  b.x = clampX(b.x + sign * (overlap - half));
  // Biri duvara dayandıysa diğeri tam bir genişlik uzağa itilir.
  if (Math.abs(b.x - a.x) < w) {
    if (a.x === MIN_X || a.x === MAX_X) b.x = clampX(a.x + sign * w);
    else a.x = clampX(b.x - sign * w);
  }
}

export function step(s: SimState, inputs: readonly [number, number]): SimState {
  const a = control(s.fighters[0], inputs[0]);
  const b = control(s.fighters[1], inputs[1]);

  separate(a, b);
  for (const [f, other] of [
    [a, b],
    [b, a],
  ] as const) {
    if (f.state !== KO && f.y >= toFx(FLOOR_Y)) f.facing = other.x > f.x ? 1 : other.x < f.x ? -1 : f.facing;
  }

  // Vuruşlar aynı anda değerlendirilir (iki taraf aynı karede vurursa ikisi de işler).
  const hitA = a.hitDone === 0 ? boxes(a).hit : null;
  const hitB = b.hitDone === 0 ? boxes(b).hit : null;
  const aHitsB = hitA !== null && b.state !== KO && overlaps(hitA, boxes(b).hurt);
  const bHitsA = hitB !== null && a.state !== KO && overlaps(hitB, boxes(a).hurt);
  if (aHitsB) applyHit(a, b);
  if (bHitsA) applyHit(b, a);

  return { frame: s.frame + 1, fighters: [a, b], rngSeed: s.rngSeed };
}

function applyHit(attacker: Mutable<Fighter>, defender: Mutable<Fighter>): void {
  const data = ATTACKS[attacker.attack];
  if (!data) return;
  attacker.hitDone = 1;
  defender.hp = Math.max(0, defender.hp - data.damage);
  defender.attack = 0;
  defender.stateFrame = 0;
  if (defender.hp === 0) {
    defender.state = KO;
    defender.hitstun = 0;
    defender.vx = 0;
  } else {
    defender.state = HITSTUN;
    defender.hitstun = data.hitstun;
    defender.vx = attacker.facing * PUSHBACK;
  }
}

export function hashState(s: SimState): number {
  const v: number[] = [s.frame, s.rngSeed];
  for (const f of s.fighters) {
    v.push(f.x, f.y, f.vx, f.vy, f.facing, f.hp, f.state, f.stateFrame, f.hitstun, f.attack, f.hitDone, f.prevInput);
  }
  return hashInts(v);
}
