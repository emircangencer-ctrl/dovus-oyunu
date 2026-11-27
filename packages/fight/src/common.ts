import { DOWN, HK, HP, LEFT, LK, LP, RIGHT, UP } from '@dovus/engine';
import { ROSTER } from './kukla';
import { type Fighter, type FighterDef, type FightState, ST } from './types';

/** Dövüş katmanının ortak yardımcıları ve durum kümeleri. */

export const BUTTONS = LP | LK | HP | HK;
export const DIRS = UP | DOWN | LEFT | RIGHT;
/** Göreli girdide ileri ve geri (rakibe doğru = ileri). */
export const FWD = RIGHT;
export const BACK = LEFT;
/** Çift dokunuş (koşma →→, geri sıçrama ←←) için iki basış arası en çok kare. */
export const TAP_WINDOW = 12;
export const NO_TAP = -1000;

export const def = (s: FightState, i: 0 | 1): FighterDef => {
  const d = ROSTER[s.chars[i]];
  if (!d) throw new Error(`Kadroda ${s.chars[i]} numaralı dövüşçü yok`);
  return d;
};

/** Girdiyi dövüşçünün baktığı yöne göre çevirir: sonuçta RIGHT = ileri, LEFT = geri. */
export function rel(input: number, facing: 1 | -1): number {
  if (facing === 1) return input;
  return (input & ~(LEFT | RIGHT)) | (input & LEFT ? RIGHT : 0) | (input & RIGHT ? LEFT : 0);
}

export const isAir = (state: number): boolean => state === ST.AIR || state === ST.AIR_ATTACK || state === ST.HIT_AIR;

/** Duruma girer (aynı durumdaysa kare sayacını ilerletir). */
export function enter(f: Fighter, state: number, patch: Partial<Fighter> = {}): Fighter {
  return { ...f, ...patch, state, stateFrame: f.state === state ? f.stateFrame + 1 : 0 };
}

export const CROUCH_STATES: ReadonlySet<number> = new Set([ST.CROUCH, ST.BLOCK_CR, ST.HIT_CR]);
export const LYING_STATES: ReadonlySet<number> = new Set([ST.KNOCKDOWN, ST.KO]);
/** Kombonun sürdüğü durumlar: savunan bunlardan birindeyken gelen vuruş komboya eklenir. */
export const COMBO_STATES: ReadonlySet<number> = new Set([ST.HIT_ST, ST.HIT_CR, ST.HIT_AIR, ST.KNOCKDOWN]);
/** Geri tutunca bloklayabilen durumlar. */
export const GUARD_STATES: ReadonlySet<number> = new Set([
  ST.IDLE,
  ST.WALK_F,
  ST.WALK_B,
  ST.CROUCH,
  ST.BLOCK_ST,
  ST.BLOCK_CR,
]);
