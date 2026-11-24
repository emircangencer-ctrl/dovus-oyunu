import { readFileSync } from 'node:fs';
import * as fontkit from 'fontkit';
import { describe, expect, it } from 'vitest';

// Piksel yazı tipinin tasarım pikseli, 1920 çerçevede tam 2 CSS pikseline (960 tabanında 1 piksele) oturmalı;
// yoksa harfler bulanıklaşır. Tasarım pikseli = birim ızgarası / em boyu.
type Style = { name: string; fontSize: string };
const tokens = JSON.parse(readFileSync('apps/game/src/ui/tokens.json', 'utf8')) as {
  type: { fonts: Array<{ family: string; file: string }>; groups: Array<{ styles: Style[] }> };
};

function gridUnits(file: string): number {
  const font = fontkit.openSync(file) as fontkit.Font;
  const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
  let unit = 0;
  for (const ch of 'AHOSaegmyİŞĞ') {
    const glyph = font.glyphForCodePoint(ch.codePointAt(0) as number);
    for (const cmd of glyph.path.commands) for (const v of cmd.args) unit = gcd(unit, Math.round(v));
  }
  return font.unitsPerEm / unit; // em başına tasarım pikseli
}

describe('piksel ızgarası', () => {
  const face = tokens.type.fonts[0];
  if (!face) throw new Error('tokens.json içinde yazı tipi yok');
  const pixelsPerEm = gridUnits(`apps/game/public/${face.file}`);
  const styles = tokens.type.groups.flatMap((g) => g.styles);

  it('yazı tipi gerçek bir piksel ızgarasına sahip', () => expect(pixelsPerEm).toBeLessThan(64));
  it.each(styles.map((s) => [s.name, s.fontSize] as const))('%s (%s) 960 tabanında tam piksel katı', (_name, size) => {
    const base = Number.parseFloat(size) / 2; // 1920 çerçeve → 960 taban
    const scale = base / pixelsPerEm;
    expect(Math.abs(scale - Math.round(scale))).toBeLessThan(0.01);
    expect(Math.round(scale)).toBeGreaterThanOrEqual(1);
  });
});
