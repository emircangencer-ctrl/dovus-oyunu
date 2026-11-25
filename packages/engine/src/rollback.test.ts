import { describe, expect, test } from 'vitest';
import { randomInputs } from './random-inputs';
import { RollbackSession, randomRewindRun } from './rollback';
import { hashState, initialState, type SimState, step } from './sim';

function plainStates(seed: number, frames: number): SimState[] {
  const ins = randomInputs(seed, frames);
  const out: SimState[] = [initialState(seed)];
  for (const i of ins) out.push(step(out[out.length - 1] as SimState, i));
  return out;
}

describe('rollback oturumu', () => {
  test('rakip girdisi 3 kare geç gelince 3 kare geri sarar ve sonuç zamanında gelenle aynıdır', () => {
    const seed = 7;
    const frames = 300;
    const ins = randomInputs(seed, frames);
    const plain = plainStates(seed, frames);
    const s = new RollbackSession({ seed, local: 0, maxRollback: 8, delay: 0 });
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
    expect(s.confirmedHash(frames - 1)).toBe(hashState(plain[frames] as SimState));
    expect(hashState(s.state)).toBe(hashState(plain[frames] as SimState));
  });

  test('girdiler sırasız gelse de sonuç aynı', () => {
    const seed = 11;
    const ins = randomInputs(seed, 60);
    const plain = plainStates(seed, 60);
    const s = new RollbackSession({ seed, local: 1, maxRollback: 8, delay: 0 });
    for (let f = 0; f < 60; f++) {
      s.addLocal(f, (ins[f] as [number, number])[1]);
      if (f % 4 === 3) for (const g of [f, f - 2, f - 1, f - 3]) s.addRemote(g, (ins[g] as [number, number])[0]);
      s.advance();
    }
    s.sync();
    expect(hashState(s.state)).toBe(hashState(plain[60] as SimState));
  });

  test('8 kareden fazla tahminle ileri gidilemez', () => {
    const s = new RollbackSession({ seed: 1, local: 0, maxRollback: 8, delay: 0 });
    for (let f = 0; f < 8; f++) {
      s.addLocal(f, 0);
      s.advance();
    }
    expect(s.canAdvance()).toBe(false);
    s.addLocal(8, 0);
    expect(() => s.advance()).toThrow(RangeError);
  });
});

test('rastgele geri sarma: 200 maçta geri sarmalı ve sarmasız oyun aynı sonucu verir', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const r = randomRewindRun(seed, 600);
    if (r.plain !== r.rewound) throw new Error(`tohum ${seed}: ${r.plain} ≠ ${r.rewound}`);
  }
  expect(true).toBe(true);
});
