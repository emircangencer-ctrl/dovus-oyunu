import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const artDir = fileURLToPath(new URL('../../public/art/', import.meta.url));

type WebpInfo = { width: number; height: number; alpha: boolean };

/** WebP başlığını okur: VP8X (genişletilmiş), VP8 (kayıplı) ve VP8L (kayıpsız) biçimleri. */
function readWebp(name: string): WebpInfo {
  const b = readFileSync(artDir + name);
  expect(b.toString('ascii', 0, 4)).toBe('RIFF');
  expect(b.toString('ascii', 8, 12)).toBe('WEBP');
  const chunk = b.toString('ascii', 12, 16);
  if (chunk === 'VP8X') {
    const alpha = (b.readUInt8(20) & 0x10) !== 0;
    const width = 1 + b.readUIntLE(24, 3);
    const height = 1 + b.readUIntLE(27, 3);
    return { width, height, alpha };
  }
  if (chunk === 'VP8 ') {
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff, alpha: false };
  }
  if (chunk === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff), alpha: ((bits >> 28) & 1) === 1 };
  }
  throw new Error(`Bilinmeyen WebP parçası: ${chunk}`);
}

describe('Canva sanat dosyaları', () => {
  test('menü arka planı 1920×1080', () => {
    const info = readWebp('menu-bg.webp');
    expect([info.width, info.height]).toEqual([1920, 1080]);
  });

  test('logo saydam zeminli ve en çok 1400 px genişlikte', () => {
    const info = readWebp('logo.webp');
    expect(info.alpha).toBe(true);
    expect(info.width).toBeLessThanOrEqual(1400);
    expect(info.width).toBeGreaterThan(info.height);
  });
});

/** PNG başlığından genişlik/yükseklik ve saydamlık (renk türü 6 = RGBA). */
function readPng(name: string): WebpInfo {
  const b = readFileSync(fileURLToPath(new URL(`../../public/brand/${name}`, import.meta.url)));
  expect(b.toString('ascii', 1, 4)).toBe('PNG');
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), alpha: b.readUInt8(25) === 6 };
}

describe('marka dosyaları', () => {
  test.each([
    ['logo@2x.png', 1080],
    ['logo-960.png', 540],
  ])('%s saydam ve %i px genişlikte', (name, width) => {
    const info = readPng(name);
    expect(info.width).toBe(width);
    expect(info.alpha).toBe(true);
  });

  test.each([
    ['favicon.png', 64],
    ['apple-touch-icon.png', 180],
  ])('%s kare ve %i px', (name, size) => {
    const info = readPng(name);
    expect([info.width, info.height]).toEqual([size, size]);
  });
});
