import { RollbackSession, randomInputs, randomRewindRun } from '@dovus/engine';
import { describe, expect, test } from 'vitest';
import { fightGame, hashState, initialState, type SimState, step } from './sim';

function plainStates(seed: number, frames: number): SimState[] {
  const ins = randomInputs(seed, frames);
  const out: SimState[] = [initialState(seed)];
  for (const i of ins) out.push(step(out[out.length - 1] as SimState, i));
  return out;
}

describe('dövüş çekirdeği rollback oturumunda', () => {
  test('rakip girdisi 3 kare geç gelince sonuç zamanında gelenle aynı', () => {
    const seed = 7;
    const frames = 300;
    const ins = randomInputs(seed, frames);
    const plain = plainStates(seed, frames);
    const s = new RollbackSession(fightGame, { seed, local: 0, maxRollback: 8, delay: 0 });
    for (let f = 0; f < frames; f++) {
      if (f >= 3) s.addRemote(f - 3, (ins[f - 3] as [number, number])[1]);
      s.addLocal(f, (ins[f] as [number, number])[0]);
      s.advance();
    }
    for (let f = frames - 3; f < frames; f++) s.addRemote(f, (ins[f] as [number, number])[1]);
    s.sync();
    expect(hashState(s.state)).toBe(hashState(plain[frames] as SimState));
  });

  test('girdiler sırasız gelse de sonuç aynı', () => {
    const seed = 11;
    const ins = randomInputs(seed, 60);
    const plain = plainStates(seed, 60);
    const s = new RollbackSession(fightGame, { seed, local: 1, maxRollback: 8, delay: 0 });
    for (let f = 0; f < 60; f++) {
      s.addLocal(f, (ins[f] as [number, number])[1]);
      if (f % 4 === 3) for (const g of [f, f - 2, f - 1, f - 3]) s.addRemote(g, (ins[g] as [number, number])[0]);
      s.advance();
    }
    s.sync();
    expect(hashState(s.state)).toBe(hashState(plain[60] as SimState));
  });
});

test('rastgele geri sarma: 200 maçta geri sarmalı ve sarmasız oyun aynı sonucu verir', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const r = randomRewindRun(fightGame, seed, 600);
    if (r.plain !== r.rewound) throw new Error(`tohum ${seed}: ${r.plain} ≠ ${r.rewound}`);
  }
  expect(true).toBe(true);
});
