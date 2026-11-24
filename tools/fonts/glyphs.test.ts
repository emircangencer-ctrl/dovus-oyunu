import { existsSync, globSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import * as fontkit from 'fontkit';
import { describe, expect, it } from 'vitest';

const FONT_DIR = 'apps/game/public/fonts';
const REQUIRED = [...'ğüşıİöçĞÜŞÖÇ'];
const fontFiles = globSync(`${FONT_DIR}/*.{woff2,woff,ttf,otf}`);
const tokens = JSON.parse(readFileSync('apps/game/src/ui/tokens.json', 'utf8')) as {
  type: { fonts: Array<{ family: string; file: string }> };
};

describe('yazı tipleri', () => {
  it('en az bir yazı tipi dosyası var', () => expect(fontFiles.length).toBeGreaterThan(0));

  it.each(fontFiles)('%s Türkçe harflerin hepsini içerir', (file) => {
    const font = fontkit.openSync(file) as fontkit.Font;
    for (const ch of REQUIRED) {
      expect(font.hasGlyphForCodePoint(ch.codePointAt(0) as number), `${file}: ${ch}`).toBe(true);
    }
  });

  it.each(fontFiles)('%s için lisans dosyası var (<Aile>-OFL.txt)', (file) => {
    const family = basename(file).split('-')[0];
    expect(existsSync(join(FONT_DIR, `${family}-OFL.txt`)), `${family}-OFL.txt`).toBe(true);
  });

  it("token'lardaki her yazı tipi dosyası depoda", () => {
    for (const face of tokens.type.fonts) {
      expect(existsSync(join(FONT_DIR, face.file.replace(/^fonts\//, ''))), face.file).toBe(true);
    }
  });
});
