import { COMBO_STATES, isAir } from './common';
import type { FighterDef } from './types';
import { type Fighter, type FightState, PHASE, ST } from './types';

/** Raunt ve maç akışı: giriş, süre, nakavt / süre bitimi, sonraki raunt, maç sonu; antrenmanda süresiz ve nakavtsız. */

/** "RAUNT n" (ilk 60 kare) ve "DÖVÜŞ!" (son 40 kare). */
export const INTRO_FRAMES = 100;
export const INTRO_FIGHT_AT = 60;
export const ROUND_END_FRAMES = 150;
/** Nakavt anında ek donma (ağır çekim hissi). */
export const KO_FREEZE = 30;

/** Ekranda gösterilen süre (saniye, yukarı yuvarlanmış). */
export const timerSeconds = (s: FightState): number => Math.trunc((s.timer + 59) / 60);

/** Free (serbest) durumlar: antrenmanda can burada dolar. */
const isFree = (f: Fighter): boolean => !COMBO_STATES.has(f.state) && f.state !== ST.WAKEUP;

function knockOut(f: Fighter): Fighter {
  if (f.hp > 0) return f;
  if (isAir(f.state)) return { ...f, state: ST.HIT_AIR, knock: 1, attack: -1, contact: 0 };
  return { ...f, state: ST.KO, stateFrame: 0, vx: 0, attack: -1, contact: 0, stun: 0 };
}

/** Bir adımdan sonra raunt akışını uygular. `frozen`: bu adım vuruş donmasıydı (süre ve evre sayacı durur). */
export function roundFlow(
  n: FightState,
  frozen: boolean,
  defs: readonly [FighterDef, FighterDef],
  reset: (s: FightState) => FightState,
): FightState {
  if (frozen) return n;
  switch (n.phase) {
    case PHASE.INTRO: {
      const pf = n.phaseFrame + 1;
      return pf >= INTRO_FRAMES ? { ...n, phase: PHASE.FIGHT, phaseFrame: 0 } : { ...n, phaseFrame: pf };
    }
    case PHASE.FIGHT: {
      const [a, b] = n.fighters;
      if (n.training) {
        const heal = (f: Fighter, d: FighterDef): Fighter =>
          f.hp <= 0 ? { ...f, hp: 1 } : isFree(f) && f.combo === 0 && f.hp < d.health ? { ...f, hp: d.health } : f;
        return { ...n, fighters: [heal(a, defs[0]), heal(b, defs[1])] };
      }
      if (a.hp === 0 || b.hp === 0) {
        const result = a.hp === 0 && b.hp === 0 ? 3 : b.hp === 0 ? 1 : 2;
        return endRound(
          { ...n, fighters: [knockOut(a), knockOut(b)], hitstop: Math.max(n.hitstop, KO_FREEZE) },
          result,
          0,
        );
      }
      const timer = n.timer - 1;
      if (timer > 0) return { ...n, timer };
      const pa = a.hp * defs[1].health;
      const pb = b.hp * defs[0].health;
      return endRound({ ...n, timer: 0 }, pa > pb ? 1 : pb > pa ? 2 : 3, 1);
    }
    case PHASE.ROUND_END: {
      const pf = n.phaseFrame + 1;
      if (pf < ROUND_END_FRAMES) return { ...n, phaseFrame: pf };
      const [w0, w1] = n.wins;
      const need = n.roundsToWin;
      if (w0 >= need || w1 >= need) {
        const winner = w0 >= need && w1 >= need ? 2 : w0 >= need ? 0 : 1;
        return { ...n, phase: PHASE.MATCH_END, phaseFrame: 0, winner };
      }
      return reset(n);
    }
    default:
      return { ...n, phaseFrame: n.phaseFrame + 1 };
  }
}

function endRound(n: FightState, result: number, reason: number): FightState {
  const wins: [number, number] = [
    n.wins[0] + (result === 1 || result === 3 ? 1 : 0),
    n.wins[1] + (result === 2 || result === 3 ? 1 : 0),
  ];
  return { ...n, phase: PHASE.ROUND_END, phaseFrame: 0, roundResult: result, roundReason: reason, wins };
}
