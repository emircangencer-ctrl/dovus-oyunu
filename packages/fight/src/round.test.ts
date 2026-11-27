import { HP, RIGHT, toFx } from '@dovus/engine';
import { describe, expect, test } from 'vitest';
import { KUKLA } from './kukla';
import { INTRO_FRAMES, ROUND_END_FRAMES, timerSeconds } from './round';
import { initialState, step } from './sim';
import { type Fighter, type FightOptions, type FightState, PHASE, ST } from './types';

const play = (s: FightState, frames: number, input: (k: number, cur: FightState) => [number, number]): FightState[] => {
  const out: FightState[] = [];
  let cur = s;
  for (let k = 0; k < frames; k++) {
    cur = step(cur, input(k, cur));
    out.push(cur);
  }
  return out;
};
const last = (frames: FightState[]): FightState => frames[frames.length - 1] as FightState;
const p1 = (s: FightState): Fighter => s.fighters[0];
const p2 = (s: FightState): Fighter => s.fighters[1];
/** Yakın mesafede başlayan, girişsiz raunt; can değerleri isteğe göre. */
const close = (opts: Partial<FightOptions> = {}, hp: [number, number] = [1000, 1000]): FightState => {
  const s = initialState({ seed: 1, intro: false, ...opts });
  const [a, b] = s.fighters;
  return {
    ...s,
    fighters: [
      { ...a, x: toFx(600), hp: hp[0] },
      { ...b, x: toFx(700), hp: hp[1] },
    ],
  };
};
/** Oyuncu 1 ağır yumrukla tek vuruş yapar. */
const oneHit = (k: number): [number, number] => [k === 0 ? HP : 0, 0];
/** Raunt bitene kadar oynatır. */
const untilPhase = (s: FightState, phase: number, input = oneHit, max = 2000): FightState => {
  let cur = s;
  for (let k = 0; k < max && cur.phase !== phase; k++) cur = step(cur, input(k));
  if (cur.phase !== phase) throw new Error(`evre ${phase} gelmedi`);
  return cur;
};

describe('raunt girişi ve süre', () => {
  test('girişte ("RAUNT 1 · DÖVÜŞ!") girdi yok sayılır, süre işlemez; sonra dövüş başlar', () => {
    const s = initialState({ seed: 1 });
    const frames = play(s, INTRO_FRAMES + 1, () => [RIGHT, 0]);
    const intro = frames[INTRO_FRAMES - 2] as FightState;
    expect(intro.phase).toBe(PHASE.INTRO);
    expect(p1(intro).x).toBe(p1(s).x);
    expect(intro.timer).toBe(s.timer);
    expect((frames[INTRO_FRAMES - 1] as FightState).phase).toBe(PHASE.FIGHT);
    expect(p1(last(frames)).state).toBe(ST.WALK_F);
  });

  test('süre dövüşte saniyede 60 kare azalır; gösterilen saniye yukarı yuvarlanır', () => {
    const s = initialState({ seed: 1, intro: false });
    expect(timerSeconds(s)).toBe(99);
    const after = last(play(s, 61, () => [0, 0]));
    expect(after.timer).toBe(99 * 60 - 61);
    expect(timerSeconds(after)).toBe(98);
  });

  test('vuruş donmasında süre durur', () => {
    const frames = play(close(), 20, oneHit);
    const hitAt = frames.findIndex((f) => f.hitstop > 0);
    const frozenTimer = (frames[hitAt] as FightState).timer;
    expect((frames[hitAt + 5] as FightState).timer).toBe(frozenTimer);
  });
});

describe('raunt sonu', () => {
  test('nakavt raundu bitirir: yenilen yere düşer, kazanana raunt yazılır', () => {
    const end = untilPhase(close({}, [1000, 10]), PHASE.ROUND_END);
    expect(p2(end).hp).toBe(0);
    expect(p2(end).state).toBe(ST.KO);
    expect(end.roundResult).toBe(1);
    expect(end.roundReason).toBe(0);
    expect(end.wins).toEqual([1, 0]);
  });

  test('süre biterse canı fazla olan kazanır; eşitse berabere ve ikisine de raunt', () => {
    const won = untilPhase(close({ timerSeconds: 1 }, [1000, 600]), PHASE.ROUND_END, () => [0, 0]);
    expect(won.roundReason).toBe(1);
    expect(won.roundResult).toBe(1);
    expect(won.wins).toEqual([1, 0]);
    const draw = untilPhase(close({ timerSeconds: 1 }), PHASE.ROUND_END, () => [0, 0]);
    expect(draw.roundResult).toBe(3);
    expect(draw.wins).toEqual([1, 1]);
  });

  test('sonraki raunt: konumlar, can ve süre sıfırlanır, galibiyetler kalır', () => {
    const end = untilPhase(close({}, [1000, 10]), PHASE.ROUND_END);
    const next = untilPhase(end, PHASE.INTRO, () => [0, 0], ROUND_END_FRAMES + 60);
    expect(next.round).toBe(2);
    expect(next.wins).toEqual([1, 0]);
    expect(p1(next).hp).toBe(KUKLA.health);
    expect(p2(next).hp).toBe(KUKLA.health);
    expect(p2(next).state).toBe(ST.IDLE);
    expect(next.fighters).toEqual(initialState({ seed: 1 }).fighters);
    expect(next.timer).toBe(next.timerFrames);
    expect(next.roundResult).toBe(0);
  });

  test('gereken raunt sayısına ulaşan maçı alır; maç bitince durum sabit kalır', () => {
    const end = untilPhase(close({ roundsToWin: 1 }, [1000, 10]), PHASE.MATCH_END);
    expect(end.winner).toBe(0);
    const later = last(play(end, 200, () => [HP, HP]));
    expect(later.phase).toBe(PHASE.MATCH_END);
    expect(later.winner).toBe(0);
  });

  test('iki raunt kazanan maçı alır (3 rauntta 2)', () => {
    let s = close({}, [1000, 10]);
    s = untilPhase(s, PHASE.ROUND_END);
    s = untilPhase(s, PHASE.FIGHT, () => [0, 0]);
    const [a, b] = s.fighters;
    s = {
      ...s,
      fighters: [
        { ...a, x: toFx(600) },
        { ...b, x: toFx(700), hp: 10 },
      ],
    };
    s = untilPhase(s, PHASE.MATCH_END);
    expect(s.wins).toEqual([2, 0]);
    expect(s.winner).toBe(0);
  });

  test('aynı anda maçı alırlarsa maç berabere biter, oyun takılmaz', () => {
    const end = untilPhase(close({ roundsToWin: 1, timerSeconds: 1 }), PHASE.MATCH_END, () => [0, 0]);
    expect(end.winner).toBe(2);
  });

  test('çift nakavt beraberedir', () => {
    const s = initialState({ seed: 1, intro: false });
    const [a, b] = s.fighters;
    const near = {
      ...s,
      fighters: [
        { ...a, x: toFx(600), hp: 5 },
        { ...b, x: toFx(690), hp: 5 },
      ],
    } as FightState;
    const end = untilPhase(near, PHASE.ROUND_END, (k) => (k === 0 ? [HP, HP] : [0, 0]));
    expect(end.roundResult).toBe(3);
    expect(p1(end).state).toBe(ST.KO);
    expect(p2(end).state).toBe(ST.KO);
  });
});

describe('antrenman', () => {
  test('süre işlemez, nakavt olmaz, kombo bitince can dolar', () => {
    const s = close({ training: true }, [1000, 10]);
    const frames = play(s, 300, oneHit);
    expect(frames.every((f) => f.phase === PHASE.FIGHT)).toBe(true);
    expect(last(frames).timer).toBe(s.timer);
    expect(Math.min(...frames.map((f) => p2(f).hp))).toBeGreaterThanOrEqual(1);
    expect(p2(last(frames)).hp).toBe(KUKLA.health);
  });
});
