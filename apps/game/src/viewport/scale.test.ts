import { describe, expect, it } from 'vitest';
import { computeScale } from './scale';

describe('computeScale', () => {
  it('1920×1080: tam 2 kat', () => {
    expect(computeScale(1920, 1080)).toEqual({
      scale: 2,
      width: 1920,
      height: 1080,
      offsetX: 0,
      offsetY: 0,
      pixelPerfect: true,
    });
  });
  it('3840×2160: tam 4 kat', () => expect(computeScale(3840, 2160).scale).toBe(4));
  it('2560×1440: 2 kat, ortalı', () => {
    expect(computeScale(2560, 1440)).toEqual({
      scale: 2,
      width: 1920,
      height: 1080,
      offsetX: 320,
      offsetY: 180,
      pixelPerfect: true,
    });
  });
  it('1366×768: 1 kat, ortalı', () => {
    expect(computeScale(1366, 768)).toEqual({
      scale: 1,
      width: 960,
      height: 540,
      offsetX: 203,
      offsetY: 114,
      pixelPerfect: true,
    });
  });
  it('1080×1920 dikey: genişliğe göre 1 kat', () => {
    expect(computeScale(1080, 1920)).toEqual({
      scale: 1,
      width: 960,
      height: 540,
      offsetX: 60,
      offsetY: 690,
      pixelPerfect: true,
    });
  });
  it('800×600: tabandan küçük, oranlı küçültme', () => {
    expect(computeScale(800, 600)).toEqual({
      scale: 800 / 960,
      width: 800,
      height: 450,
      offsetX: 0,
      offsetY: 75,
      pixelPerfect: false,
    });
  });
});
