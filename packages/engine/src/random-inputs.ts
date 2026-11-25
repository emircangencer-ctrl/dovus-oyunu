import { Rng } from './rng';

/** Tohumlu rastgele girdi akışı: her oyuncu girdisini 1–10 karede bir değiştirir (gerçek oyuna yakın). */
export function randomInputs(seed: number, frames: number): Array<[number, number]> {
  const r = new Rng(seed);
  const out: Array<[number, number]> = [];
  const cur: [number, number] = [0, 0];
  const left: [number, number] = [0, 0];
  for (let f = 0; f < frames; f++) {
    for (const p of [0, 1] as const) {
      if (left[p] === 0) {
        cur[p] = r.int(256);
        left[p] = 1 + r.int(10);
      }
      left[p] -= 1;
    }
    out.push([cur[0], cur[1]]);
  }
  return out;
}
