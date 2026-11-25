import { describe, expect, test } from 'vitest';
import { FX, fxToPx, toFx } from './fixed';
import { hashInts } from './hash';
import { Rng } from './rng';

describe('sabit nokta', () => {
  test('1 taban pikseli 256 birim', () => {
    expect(FX).toBe(256);
    expect(toFx(1)).toBe(256);
    expect(toFx(-3)).toBe(-768);
    expect(fxToPx(toFx(440))).toBe(440);
    expect(fxToPx(383)).toBe(1); // aşağı yuvarlar: 383/256 = 1.49
  });
});

describe('xorshift32', () => {
  test('tohum 1 için ilk beş değer (elle hesaplandı)', () => {
    const r = new Rng(1);
    expect([r.next(), r.next(), r.next(), r.next(), r.next()]).toEqual([
      270369, 67634689, 2647435461, 307599695, 2398689233,
    ]);
  });

  test('int(n) her zaman [0, n) içinde', () => {
    const r = new Rng(12345);
    for (let i = 0; i < 10_000; i++) {
      const v = r.int(7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
  });

  test('0 tohum geçersiz sayılmaz, sabit bir tohuma çevrilir', () => {
    expect(new Rng(0).next()).not.toBe(0);
  });
});

describe('FNV-1a durum özeti', () => {
  test('boş girdi başlangıç değerini verir', () => {
    expect(hashInts([])).toBe(0x811c9dc5);
  });

  test('sıra önemli ve negatif sayılar int32 olarak işlenir', () => {
    expect(hashInts([1, 2])).toBe(3738734694);
    expect(hashInts([2, 1])).toBe(108523670);
    expect(hashInts([-1])).toBe(3809873841);
  });
});
