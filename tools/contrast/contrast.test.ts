import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio, resolve } from './contrast';

const tokens = JSON.parse(readFileSync('apps/game/src/ui/tokens.json', 'utf8')) as {
  contrastPairs: Array<[string, string, number]>;
};

describe('contrastRatio (WCAG 2.x)', () => {
  it('siyah/beyaz 21:1', () => expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5));
  it('aynı renk 1:1', () => expect(contrastRatio('#4d86f7', '#4d86f7')).toBeCloseTo(1, 5));
  it('sıra fark etmez', () =>
    expect(contrastRatio('#ffffff', '#777777')).toBeCloseTo(contrastRatio('#777777', '#ffffff'), 10));
  it('#777777 beyaz üstünde 4.48:1 (sınırın hemen altı)', () =>
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2));
  it('kısa yazım (#fff) kabul edilir', () => expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 5));
  it('geçersiz rengi reddeder', () => expect(() => contrastRatio('red', '#fff')).toThrow());
});

describe('resolve', () => {
  it('token yolundan #rrggbb döner', () => expect(resolve('color.text-primary')).toMatch(/^#[0-9a-f]{6}$/));
  it('takma adı ({başka-token}) çözer', () => expect(resolve('color.focus-ring')).toBe(resolve('color.gold-400')));
  it('olmayan token için hata verir', () => expect(() => resolve('color.yok-boyle')).toThrow(/yok-boyle/));
});

describe('metin/zemin kontrastı', () => {
  it('zorunlu çiftler tanımlı', () => expect(tokens.contrastPairs.length).toBeGreaterThanOrEqual(5));
  it.each(tokens.contrastPairs)('%s / %s en az %s:1', (fg, bg, min) => {
    expect(contrastRatio(resolve(fg), resolve(bg))).toBeGreaterThanOrEqual(min);
  });
});
