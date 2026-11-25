import { describe, expect, test } from 'vitest';
import { Metrics } from './metrics';

const feed = (m: Metrics, ms: number, n: number): void => {
  for (let i = 0; i < n; i++) m.frame(ms);
};

describe('kare düşmesi ölçümü', () => {
  test('60 Hz ekranda düzgün akış: düşen kare yok; 2 karelik takılma 1 düşen kare', () => {
    const m = new Metrics(10);
    feed(m, 1000 / 60, 120 + 480);
    expect(m.summary().dropped).toBe(0);
    m.frame(34);
    expect(m.summary().dropped).toBe(1);
  });

  test('144 Hz ekranda eşik ekranın kendi aralığına göre: 10 ms sorun değil, 14 ms düşen kare', () => {
    const m = new Metrics(10);
    feed(m, 1000 / 144, 200);
    m.frame(10);
    expect(m.summary().dropped).toBe(0);
    m.frame(14);
    expect(m.summary().dropped).toBe(1);
  });

  test('ilk 120 kare temel ölçüdür, sayılmaz', () => {
    const m = new Metrics(10);
    m.frame(100);
    feed(m, 1000 / 60, 119);
    expect(m.summary().dropped).toBe(0);
  });
});

describe('sonuç', () => {
  const full = (opts: { step?: number; rb?: number; hidden?: boolean; seconds?: number } = {}) => {
    const m = new Metrics(10);
    feed(m, 1000 / 60, Math.round((opts.seconds ?? 10) * 60));
    for (let i = 0; i < 600; i++) m.simStep();
    m.stepTime(opts.step ?? 0.05);
    m.rollbackTime(opts.rb ?? 0.4, 8);
    if (opts.hidden) m.hidden();
    return m.summary();
  };

  test('şartlar sağlanınca GEÇTİ; simülasyon saniyede 60 adım', () => {
    const s = full();
    expect(s.verdict).toBe('GEÇTİ');
    expect(s.simPerSecond).toBeCloseTo(60, 0);
  });

  test('adım 1 ms ve üstü ya da 8 kare geri sarma 4 ms ve üstü KALDI', () => {
    expect(full({ step: 0.99 }).verdict).toBe('GEÇTİ');
    expect(full({ step: 1 }).verdict).toBe('KALDI');
    expect(full({ rb: 3.99 }).verdict).toBe('GEÇTİ');
    expect(full({ rb: 4 }).verdict).toBe('KALDI');
  });

  test('yalnız 8 karelik geri sarmalar sayılır', () => {
    const m = new Metrics(1);
    feed(m, 1000 / 60, 60);
    m.rollbackTime(9, 3);
    expect(m.summary().maxRollback8Ms).toBe(0);
  });

  test('sekme gizlenirse GEÇERSİZ; süre dolmadan SÜRÜYOR', () => {
    expect(full({ hidden: true }).verdict).toBe('GEÇERSİZ');
    expect(full({ seconds: 5 }).verdict).toBe('SÜRÜYOR');
  });
});

test('ısınma: ilk 120 karedeki adım ve geri sarma süreleri sayılmaz (JIT derlemesi)', () => {
  const m = new Metrics(10);
  m.stepTime(5);
  m.rollbackTime(9, 8);
  feed(m, 1000 / 60, 120);
  m.stepTime(0.2);
  m.rollbackTime(0.5, 8);
  expect(m.summary().maxStepMs).toBe(0.2);
  expect(m.summary().maxRollback8Ms).toBe(0.5);
});
