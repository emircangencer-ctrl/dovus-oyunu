import { describe, expect, test } from 'vitest';
import { randomInputs } from './random-inputs';
import { type Game, RollbackSession, randomRewindRun } from './rollback';

/** Dövüşten bağımsız oyuncak oyun: girdilerin sırasına duyarlı bir birikim. Rollback'in oyun bilmediğini kanıtlar. */
interface Toy {
  readonly frame: number;
  readonly acc: number;
}
const toy: Game<Toy> = {
  init: (seed) => ({ frame: 0, acc: seed | 0 }),
  step: (s, [a, b]) => ({ frame: s.frame + 1, acc: (Math.imul(s.acc, 31) + a * 7 + b * 13) | 0 }),
  hash: (s) => (s.acc ^ Math.imul(s.frame, 0x9e3779b1)) >>> 0,
  frame: (s) => s.frame,
};

function plainHash(seed: number, frames: number): number {
  let s = toy.init(seed);
  for (const i of randomInputs(seed, frames)) s = toy.step(s, i);
  return toy.hash(s);
}

describe('rollback oturumu (oyundan bağımsız)', () => {
  test('rakip girdisi 3 kare geç gelince 3 kare geri sarar ve sonuç zamanında gelenle aynıdır', () => {
    const seed = 7;
    const frames = 300;
    const ins = randomInputs(seed, frames);
    const s = new RollbackSession(toy, { seed, local: 0, maxRollback: 8, delay: 0 });
    let deepest = 0;
    for (let f = 0; f < frames; f++) {
      if (f >= 3) s.addRemote(f - 3, (ins[f - 3] as [number, number])[1]);
      s.addLocal(f, (ins[f] as [number, number])[0]);
      s.advance();
      deepest = Math.max(deepest, s.lastRollbackFrames);
    }
    for (let f = frames - 3; f < frames; f++) s.addRemote(f, (ins[f] as [number, number])[1]);
    s.sync();
    expect(deepest).toBe(3);
    expect(s.confirmedFrame).toBe(frames - 1);
    expect(s.confirmedHash(frames - 1)).toBe(plainHash(seed, frames));
    expect(toy.hash(s.state)).toBe(plainHash(seed, frames));
  });

  test('8 kareden fazla tahminle ileri gidilemez', () => {
    const s = new RollbackSession(toy, { seed: 1, local: 0, maxRollback: 8, delay: 0 });
    for (let f = 0; f < 8; f++) {
      s.addLocal(f, 0);
      s.advance();
    }
    expect(s.canAdvance()).toBe(false);
    s.addLocal(8, 0);
    expect(() => s.advance()).toThrow(RangeError);
  });

  test('rastgele geri sarma oyuncak oyunda da sarmasızla aynı', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const r = randomRewindRun(toy, seed, 300);
      expect(r.rewound).toBe(r.plain);
    }
  });
});
