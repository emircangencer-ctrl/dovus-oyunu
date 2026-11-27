import { DOWN, HK, HP, LK, LP, toFx } from '@dovus/engine';
import { hitbox, hurtbox, overlaps } from './boxes';
import { BACK, COMBO_STATES, CROUCH_STATES, GUARD_STATES, isAir, rel } from './common';
import type { AttackDef, Fighter, FighterDef, Guard } from './types';
import { ST } from './types';

/** Vuruşlar: tuştan saldırı seçimi, zincir, temas (isabet ya da blok), hasar azalması, itme ve savrulma. */

/** Geri itilme bu kadar karede uygulanır (itme px × 256 / 8 = px × 32 birim/kare, hep tam sayı). */
export const PUSH_FRAMES = 8;
export const KNOCKDOWN_FRAMES = 40;
export const WAKEUP_FRAMES = 20;
/** Havada vurulan hafifçe yukarı ve geriye savrulur. */
const POP_VX = toFx(3);
const POP_VY = toFx(-6);
/** Havada vurulup ayakları üstüne inen için ek toparlanma. */
export const AIR_RESET_LAND = 4;

/** Basılan tuşlardan en güçlüsü: D, C, B, A sırası (0 = A … 3 = D); yoksa -1. */
export function strongest(pressed: number): number {
  if (pressed & HK) return 3;
  if (pressed & HP) return 2;
  if (pressed & LK) return 1;
  if (pressed & LP) return 0;
  return -1;
}

const strongestLight = (pressed: number): number => (pressed & LK ? 1 : pressed & LP ? 0 : -1);

export function startAttack(f: Fighter, attack: number, state: number = ST.ATTACK): Fighter {
  return { ...f, state, stateFrame: 0, attack, contact: 0, vx: state === ST.ATTACK ? 0 : f.vx };
}

/** Yerde serbest durumdan saldırı: aşağı basılıysa çömelik, değilse ayakta. */
export function groundAttack(f: Fighter, d: FighterDef, r: number, pressed: number): Fighter | null {
  const b = strongest(pressed);
  if (b < 0) return null;
  const table = r & DOWN ? d.normals.cr : d.normals.st;
  return startAttack(f, table[b] as number);
}

/** Havada zıplama başına bir normal vuruş. */
export function airAttack(f: Fighter, d: FighterDef, pressed: number): Fighter | null {
  const b = strongest(pressed);
  if (b < 0 || f.air & 2) return null;
  return { ...startAttack(f, d.normals.air[b] as number, ST.AIR_ATTACK), air: f.air | 2 };
}

/** Yerdeki saldırının bu karesi: zincir, sonraki kare ya da bitiş (null = serbest duruma dön). */
export function attackFrame(f: Fighter, d: FighterDef, r: number, pressed: number): Fighter | null {
  const atk = d.attacks[f.attack];
  if (!atk) return null;
  if (atk.chain && f.contact !== 0 && f.stateFrame >= atk.startup) {
    const b = strongestLight(pressed);
    if (b >= 0) {
      const table = r & DOWN ? d.normals.cr : d.normals.st;
      return startAttack(f, table[b] as number);
    }
  }
  if (f.stateFrame + 1 >= atk.startup + atk.active + atk.recovery) return null;
  return { ...f, stateFrame: f.stateFrame + 1 };
}

const guardOk = (guard: Guard, r: number): boolean =>
  guard === 'low' ? (r & DOWN) !== 0 : guard === 'over' ? (r & DOWN) === 0 : true;

/** Kombo içinde n'inci vuruşun hasar yüzdesi: ilk iki tam, sonra her vuruşta %10 az, en az %30. */
export const comboScale = (n: number): number => (n <= 2 ? 100 : Math.max(30, 100 - 10 * (n - 2)));

interface Contact {
  readonly attacker: 0 | 1;
  readonly atk: AttackDef;
  readonly blocked: boolean;
  readonly cx: number;
  readonly cy: number;
}

function hitOrBlock(defender: Fighter, attacker: Fighter, c: Contact, defenderInput: number): Fighter {
  const { atk } = c;
  const away = defender.x > attacker.x ? 1 : defender.x < attacker.x ? -1 : attacker.facing;
  const r = rel(defenderInput, defender.facing);
  const push = { pushV: away * atk.push * (256 / PUSH_FRAMES), pushFrames: PUSH_FRAMES };
  if (c.blocked) {
    return {
      ...defender,
      ...push,
      state: r & DOWN ? ST.BLOCK_CR : ST.BLOCK_ST,
      stateFrame: 0,
      stun: atk.blockstun,
      vx: 0,
      attack: -1,
      contact: 0,
      combo: 0,
      comboDamage: 0,
    };
  }
  const n = (COMBO_STATES.has(defender.state) ? defender.combo : 0) + 1;
  const dmg = Math.trunc((atk.damage * comboScale(n)) / 100);
  const base = {
    ...defender,
    hp: Math.max(0, defender.hp - dmg),
    attack: -1,
    contact: 0,
    invuln: 0,
    combo: n,
    comboDamage: (n === 1 ? 0 : defender.comboDamage) + dmg,
    stateFrame: 0,
  };
  if (isAir(defender.state)) {
    return {
      ...base,
      state: ST.HIT_AIR,
      vx: away * POP_VX,
      vy: POP_VY,
      knock: atk.knockdown ? 1 : 0,
      stun: 0,
      pushFrames: 0,
      pushV: 0,
    };
  }
  if (atk.knockdown) return { ...base, ...push, state: ST.KNOCKDOWN, stun: KNOCKDOWN_FRAMES, vx: 0 };
  return {
    ...base,
    ...push,
    state: CROUCH_STATES.has(defender.state) ? ST.HIT_CR : ST.HIT_ST,
    stun: atk.hitstun,
    vx: 0,
  };
}

function findContact(i: 0 | 1, x: Fighter, y: Fighter, dx: FighterDef, dy: FighterDef, yInput: number): Contact | null {
  if (x.contact !== 0) return null;
  const hb = hitbox(x, dx);
  const hu = hurtbox(y, dy);
  if (!hb || !hu || !overlaps(hb, hu)) return null;
  const atk = dx.attacks[x.attack] as AttackDef;
  const r = rel(yInput, y.facing);
  const blocked = GUARD_STATES.has(y.state) && (r & BACK) !== 0 && guardOk(atk.guard, r);
  const cx = (Math.max(hb.x, hu.x) + Math.min(hb.x + hb.w, hu.x + hu.w)) >> 1;
  const cy = (Math.max(hb.y, hu.y) + Math.min(hb.y + hb.h, hu.y + hu.h)) >> 1;
  return { attacker: i, atk, blocked, cx, cy };
}

export interface ContactResult {
  readonly fighters: [Fighter, Fighter];
  readonly hitstop: number;
  readonly spark: { readonly x: number; readonly y: number; readonly kind: number } | null;
}

/** İki tarafın temasını aynı konumlardan bulur, sonra ikisini birden uygular (aynı karede takas mümkün). */
export function resolveContacts(
  a: Fighter,
  b: Fighter,
  da: FighterDef,
  db: FighterDef,
  inputs: readonly [number, number],
): ContactResult {
  const ca = findContact(0, a, b, da, db, inputs[1]);
  const cb = findContact(1, b, a, db, da, inputs[0]);
  if (!ca && !cb) return { fighters: [a, b], hitstop: 0, spark: null };
  let na = ca ? { ...a, contact: ca.blocked ? 2 : 1 } : a;
  let nb = cb ? { ...b, contact: cb.blocked ? 2 : 1 } : b;
  if (ca) nb = hitOrBlock(nb, a, ca, inputs[1]);
  if (cb) na = hitOrBlock(na, b, cb, inputs[0]);
  const first = (ca ?? cb) as Contact;
  return {
    fighters: [na, nb],
    hitstop: Math.max(ca?.atk.hitstop ?? 0, cb?.atk.hitstop ?? 0),
    spark: { x: first.cx, y: first.cy, kind: first.blocked ? 2 : 1 },
  };
}
