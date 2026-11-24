import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const css = readFileSync(`${root}apps/game/src/ui/kit.css`, 'utf8');
const tokens = JSON.parse(readFileSync(`${root}apps/game/src/ui/tokens.json`, 'utf8'));

function tokenNames(): Set<string> {
  const names = new Set<string>();
  for (const t of tokens.color.tokens) names.add(t.name);
  for (const fam of ['spacing', 'radius', 'shadow', 'pixel']) for (const t of tokens[fam].tokens) names.add(t.name);
  for (const k of Object.keys(tokens.type.families)) names.add(`font-${k}`);
  return names;
}

describe('arayüz kiti (kit.css)', () => {
  test('kale teması renkleri token olarak tanımlı', () => {
    const names = tokenNames();
    for (const n of [
      'sky-900',
      'navy-900',
      'navy-800',
      'steel-300',
      'bronze-500',
      'cyan-400',
      'go-500',
      'stop-500',
      'blue-500',
      'gem-500',
      'gold-600',
    ]) {
      expect(names, n).toContain(n);
    }
  });

  test('kullanılan her değişken tanımlı (token ya da kitin kendi :root değişkeni)', () => {
    const own = new Set([...css.matchAll(/(?<![\w(-])--([a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    const known = new Set([...tokenNames(), ...own]);
    const used = new Set([...css.matchAll(/var\(--([a-z0-9-]+)\)/g)].map((m) => m[1]));
    const missing = [...used].filter((n) => !known.has(n));
    expect(missing).toEqual([]);
  });

  test('temel bileşen sınıflarının hepsi var', () => {
    for (const cls of [
      'ds-btn',
      'ds-btn--go',
      'ds-btn--stop',
      'ds-panel',
      'ds-plate',
      'ds-ribbon',
      'ds-match',
      'ds-table',
      'ds-hints',
      'ds-menu-item',
      'ds-toast',
    ]) {
      expect(css, cls).toMatch(new RegExp(`\\.${cls}[\\s.:,{]`));
    }
  });

  test('parıltı bulanık değil: box-shadow ve text-shadow bulanıklık yarıçapı kullanmaz', () => {
    const shadows = [...css.matchAll(/(?:box|text)-shadow:\s*([^;]+);/g)].map((m) => m[1] ?? '');
    for (const s of shadows) {
      for (const part of s.split(/,(?![^(]*\))/)) {
        const lengths = part.trim().match(/-?\d+(?:\.\d+)?px|\b0\b/g) ?? [];
        // ofset-x, ofset-y, bulanıklık (varsa) — üçüncü uzunluk 0 olmalı
        if (lengths.length >= 3) expect(lengths[2], part).toMatch(/^0(px)?$/);
      }
    }
  });
});
