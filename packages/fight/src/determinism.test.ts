import { hashInts, randomInputs } from '@dovus/engine';
import { expect, test } from 'vitest';
import { hashState, initialState, step } from './sim';

function playMatch(seed: number): number {
  let s = initialState(seed);
  for (const inp of randomInputs(seed, 600)) s = step(s, inp);
  return hashState(s);
}

test('10.000 rastgele maç: her maç iki kez oynanınca aynı özeti verir; toplam özet sabit', () => {
  const finals: number[] = [];
  for (let seed = 1; seed <= 10_000; seed++) {
    const a = playMatch(seed);
    const b = playMatch(seed);
    if (a !== b) throw new Error(`Maç ${seed} farklı sonuç verdi: ${a} ≠ ${b}`);
    finals.push(a);
  }
  // Altın değer: motor davranışı bilerek değişirse güncellenir (spec Bölüm 11, altın tekrarlar).
  expect(hashInts(finals)).toMatchInlineSnapshot(`3464579132`);
}, 60_000);
