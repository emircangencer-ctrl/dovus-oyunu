import { toFx } from '@dovus/engine';
import { CROUCH_STATES, isAir, LYING_STATES } from './common';
import { type Box, type Fighter, type FighterDef, ST } from './types';

/** Veri kutusunu (taban pikseli, sağa bakarken) dünya birimine çevirir. */
export function worldBox(f: Fighter, b: Box): Box {
  return {
    x: f.facing === 1 ? f.x + toFx(b.x) : f.x - toFx(b.x + b.w),
    y: f.y + toFx(b.y),
    w: toFx(b.w),
    h: toFx(b.h),
  };
}

const LYING: Box = { x: -80, y: -36, w: 160, h: 36 };

/** Gövde kutusu (çizim için): duruşa göre ayakta, çömelik, havada ya da yerde yatan. */
export function bodyBox(f: Fighter, d: FighterDef): Box {
  if (LYING_STATES.has(f.state)) return worldBox(f, LYING);
  if (CROUCH_STATES.has(f.state)) return worldBox(f, d.crouchHurt);
  if (isAir(f.state)) return worldBox(f, d.airHurt);
  return worldBox(f, d.standHurt);
}

/** Vurulabilir kutu (dünya birimi); yerde yatarken, kalkarken, havada savrulurken ya da dokunulmazken yok. */
export function hurtbox(f: Fighter, d: FighterDef): Box | null {
  if (f.invuln > 0 || f.state === ST.WAKEUP || f.state === ST.HIT_AIR || LYING_STATES.has(f.state)) return null;
  return bodyBox(f, d);
}

/** Vuruş kutusu yalnız saldırının aktif karelerinde (dünya birimi). */
export function hitbox(f: Fighter, d: FighterDef): Box | null {
  if ((f.state !== ST.ATTACK && f.state !== ST.AIR_ATTACK) || f.attack < 0) return null;
  const atk = d.attacks[f.attack];
  if (!atk) return null;
  const t = f.stateFrame;
  if (t < atk.startup || t >= atk.startup + atk.active) return null;
  return worldBox(f, atk.box);
}

export const overlaps = (a: Box, b: Box): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
