import { DOWN, FX, LEFT, RIGHT, toFx, UP } from '@dovus/engine';
import { describe, expect, test } from 'vitest';
import { KUKLA } from './kukla';
import { cameraX, initialState, step } from './sim';
import { FLOOR_Y, MAX_SEPARATION, STAGE_LEFT, STAGE_RIGHT } from './stage';
import { type Fighter, type FightState, ST } from './types';

const start = (ax = 570, bx = 870): FightState => {
  const s = initialState({ seed: 1, intro: false });
  const [a, b] = s.fighters;
  return {
    ...s,
    fighters: [
      { ...a, x: toFx(ax) },
      { ...b, x: toFx(bx) },
    ],
  };
};
const run = (s: FightState, frames: number, i0 = 0, i1 = 0): FightState => {
  let cur = s;
  for (let k = 0; k < frames; k++) cur = step(cur, [i0, i1]);
  return cur;
};
/** Her karede çağrılan girdi fonksiyonuyla oynatır ve her karenin durumunu toplar. */
const play = (s: FightState, frames: number, input: (k: number) => [number, number]): FightState[] => {
  const out: FightState[] = [];
  let cur = s;
  for (let k = 0; k < frames; k++) {
    cur = step(cur, input(k));
    out.push(cur);
  }
  return out;
};
const p1 = (s: FightState): Fighter => s.fighters[0];
const p2 = (s: FightState): Fighter => s.fighters[1];
const heightPx = (f: Fighter): number => (toFx(FLOOR_Y) - f.y) / FX;

describe('yürüme ve çömelme', () => {
  test('ileri yürüme rakibe doğru, geri yürüme daha yavaş ve uzağa', () => {
    const s = start();
    expect(p1(run(s, 10, RIGHT)).x - p1(s).x).toBe(10 * KUKLA.walkF);
    expect(p1(run(s, 10, RIGHT)).state).toBe(ST.WALK_F);
    expect(p2(run(s, 10, 0, LEFT)).x - p2(s).x).toBe(-10 * KUKLA.walkF);
    expect(p1(run(s, 10, LEFT)).x - p1(s).x).toBe(-10 * KUKLA.walkB);
    expect(p1(run(s, 10, LEFT)).state).toBe(ST.WALK_B);
  });

  test('aşağı, aşağı-geri ve aşağı-ileri çömeltir, hareket ettirmez', () => {
    const s = start();
    for (const i of [DOWN, DOWN | LEFT, DOWN | RIGHT]) {
      const r = run(s, 5, i);
      expect(p1(r).state).toBe(ST.CROUCH);
      expect(p1(r).x).toBe(p1(s).x);
    }
  });

  test('sol ve sağ birlikte basılıysa nötr', () => {
    const r = run(start(), 5, LEFT | RIGHT);
    expect(p1(r).state).toBe(ST.IDLE);
    expect(p1(r).x).toBe(p1(start()).x);
  });
});

describe('zıplama', () => {
  test('4 kare hazırlık, sonra havada; yukarı basılı kalırsa normal, bırakılırsa kısa zıplama', () => {
    const s = start();
    const normal = play(s, 60, () => [UP, 0]);
    for (let k = 0; k < KUKLA.jump.prejump; k++) {
      expect(p1(normal[k] as FightState).state).toBe(ST.PREJUMP);
      expect(p1(normal[k] as FightState).y).toBe(toFx(FLOOR_Y));
    }
    expect(p1(normal[KUKLA.jump.prejump] as FightState).state).toBe(ST.AIR);
    const hop = play(s, 60, (k) => [k < 2 ? UP : 0, 0]);
    const apex = (frames: FightState[]): number => Math.max(...frames.map((f) => heightPx(p1(f))));
    expect(apex(normal)).toBeGreaterThanOrEqual(120);
    expect(apex(normal)).toBeLessThanOrEqual(140);
    expect(apex(hop)).toBeGreaterThanOrEqual(55);
    expect(apex(hop)).toBeLessThanOrEqual(75);
  });

  test('yön: yukarı-ileri ileri gider, yukarı-geri geri, dik yukarı yerinde', () => {
    const dx = (i: number): number => p1(run(start(), 20, i)).x - p1(start()).x;
    expect(dx(UP | RIGHT)).toBeGreaterThan(0);
    expect(dx(UP | LEFT)).toBeLessThan(0);
    expect(dx(UP)).toBe(0);
  });

  test('inişte kısa toparlanma, sonra beklemeye döner', () => {
    const frames = play(start(), 80, (k) => [k === 0 ? UP : 0, 0]);
    const landAt = frames.findIndex((f, k) => k > 5 && p1(f).state === ST.LANDING);
    expect(landAt).toBeGreaterThan(0);
    for (let k = 0; k < KUKLA.jump.land; k++) expect(p1(frames[landAt + k] as FightState).state).toBe(ST.LANDING);
    expect(p1(frames[landAt + KUKLA.jump.land] as FightState).state).toBe(ST.IDLE);
    expect(p1(frames[landAt] as FightState).y).toBe(toFx(FLOOR_Y));
  });
});

describe('koşma ve geri sıçrama', () => {
  test('ileriye iki dokunuş (12 kare içinde) koşturur; bırakınca durur', () => {
    const frames = play(start(), 30, (k) => [k === 0 || k >= 4 ? RIGHT : 0, 0]);
    const runFrame = frames[10] as FightState;
    expect(p1(runFrame).state).toBe(ST.RUN);
    expect(p1(frames[11] as FightState).x - p1(runFrame).x).toBe(KUKLA.run);
    const stopped = run(frames[29] as FightState, 1, 0);
    expect(p1(stopped).state).toBe(ST.IDLE);
  });

  test('dokunuşlar arası 12 kareden uzunsa yalnız yürür', () => {
    const frames = play(start(), 30, (k) => [k === 0 || k >= 15 ? RIGHT : 0, 0]);
    expect(p1(frames[20] as FightState).state).toBe(ST.WALK_F);
  });

  test('geriye iki dokunuş geri sıçratır: geri gider, ilk kareler dokunulmaz, sonra serbest', () => {
    const frames = play(start(), 40, (k) => [k === 0 || k === 3 ? LEFT : 0, 0]);
    const bd = frames[3] as FightState;
    expect(p1(bd).state).toBe(ST.BACKDASH);
    expect(p1(bd).invuln).toBeGreaterThan(0);
    expect(p1(frames[3 + KUKLA.backdash.frames - 1] as FightState).x).toBeLessThan(p1(start()).x - toFx(40));
    expect(p1(frames[3 + KUKLA.backdash.frames + 2] as FightState).state).toBe(ST.IDLE);
  });
});

describe('sahne, itme ve yön', () => {
  test('sahne kenarında durur', () => {
    const r = run(start(200, 500), 200, LEFT);
    expect(p1(r).x).toBe(toFx(STAGE_LEFT));
  });

  test('iki taraf ters yöne kaçsa da aradaki mesafe ekran genişliği sınırını aşmaz', () => {
    const frames = play(start(), 400, () => [LEFT, RIGHT]);
    for (const f of frames) {
      expect(p2(f).x - p1(f).x).toBeLessThanOrEqual(toFx(MAX_SEPARATION));
      expect(p1(f).x).toBeGreaterThanOrEqual(toFx(STAGE_LEFT));
      expect(p2(f).x).toBeLessThanOrEqual(toFx(STAGE_RIGHT));
    }
    const last = frames[frames.length - 1] as FightState;
    expect(p2(last).x - p1(last).x).toBe(toFx(MAX_SEPARATION));
    expect(cameraX(last)).toBeGreaterThanOrEqual(0);
  });

  test('yürüyerek rakibi iter; itme kutuları iç içe geçmez', () => {
    const frames = play(start(600, 700), 120, () => [RIGHT, 0]);
    for (const f of frames) expect(p2(f).x - p1(f).x).toBeGreaterThanOrEqual(toFx(2 * KUKLA.pushHalf));
    expect(p2(frames[119] as FightState).x).toBeGreaterThan(toFx(700));
  });

  test('kısa zıplama ayaktaki rakibin üstünden geçemez', () => {
    const frames = play(start(600, 680), 60, (k) => [k < 2 ? UP | RIGHT : 0, 0]);
    for (const f of frames) expect(p1(f).x).toBeLessThan(p2(f).x);
  });

  test('normal zıplamayla rakibin üstünden geçince yön havada değil, inince döner', () => {
    const frames = play(start(600, 690), 70, (k) => [k < 6 ? UP | RIGHT : 0, 0]);
    const crossed = frames.findIndex((f) => p1(f).x > p2(f).x && p1(f).state === ST.AIR);
    expect(crossed).toBeGreaterThan(0);
    expect(p1(frames[crossed] as FightState).facing).toBe(1);
    const landed = frames.findIndex((f, k) => k > crossed && p1(f).state === ST.LANDING);
    expect(p1(frames[landed] as FightState).facing).toBe(-1);
    expect(p2(frames[landed] as FightState).facing).toBe(1);
  });
});
