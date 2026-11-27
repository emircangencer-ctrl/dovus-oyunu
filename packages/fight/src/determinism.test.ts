import { hashInts, randomInputs } from '@dovus/engine';
import { expect, test } from 'vitest';
import { hashState, initialState, step } from './sim';
import { PHASE } from './types';

/** Kısa raunt süresiyle (3 sn) 600 kare: giriş, dövüş, süre bitimi ve ikinci rauntun başı aynı maçta oynanır. */
function playMatch(seed: number, frames = 600, timerSeconds = 3): { hash: number; phase: number } {
  let s = initialState({ seed, timerSeconds });
  for (const inp of randomInputs(seed, frames)) s = step(s, inp);
  return { hash: hashState(s), phase: s.phase };
}

test('10.000 rastgele maç: her maç iki kez oynanınca aynı özeti verir; toplam özet sabit', () => {
  const finals: number[] = [];
  for (let seed = 1; seed <= 10_000; seed++) {
    const a = playMatch(seed).hash;
    const b = playMatch(seed).hash;
    if (a !== b) throw new Error(`Maç ${seed} farklı sonuç verdi: ${a} ≠ ${b}`);
    finals.push(a);
  }
  // Altın değer: motor davranışı bilerek değişirse güncellenir (spec Bölüm 11, altın tekrarlar).
  expect(hashInts(finals)).toMatchInlineSnapshot(`3834145860`);
}, 180_000);

test('500 maç baştan sona (maç sonuna kadar): iki kez oynanınca aynı; hepsi maç sonuna varır', () => {
  const finals: number[] = [];
  for (let seed = 1; seed <= 500; seed++) {
    const a = playMatch(seed, 2400, 3);
    const b = playMatch(seed, 2400, 3);
    if (a.hash !== b.hash) throw new Error(`Maç ${seed} farklı sonuç verdi`);
    if (a.phase !== PHASE.MATCH_END) throw new Error(`Maç ${seed} bitmedi (evre ${a.phase})`);
    finals.push(a.hash);
  }
  expect(hashInts(finals)).toMatchInlineSnapshot(`3812255077`);
}, 180_000);
