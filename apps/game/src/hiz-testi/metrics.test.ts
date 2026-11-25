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

describe('Emir bilgisayarı ölçümü sonrası teşhis (adım dağılımı, düşen kare kaydı, kare başına iş)', () => {
  const warm = (m: Metrics): void => feed(m, 1000 / 60, 120);

  test('adım süreleri dağılımı: ortanca, %99,9 ve 1 ms üstü sayısı', () => {
    const m = new Metrics(10);
    warm(m);
    for (let i = 0; i < 998; i++) m.stepTime(0.1);
    m.stepTime(1.0);
    m.stepTime(0.30000000000000004);
    const s = m.summary();
    expect(s.p50StepMs).toBeCloseTo(0.1, 5);
    expect(s.p999StepMs).toBeCloseTo(0.3, 5);
    expect(s.stepsOver1Ms).toBe(1);
    expect(s.maxStepMs).toBe(1.0);
  });

  test('100 µs saat adımlarında (0,09999…) yuvarlama hatası alt kovaya düşürmez', () => {
    const m = new Metrics(10);
    warm(m);
    m.stepTime(0.29999999999999993);
    expect(m.summary().p50StepMs).toBeCloseTo(0.3, 5);
  });

  test('tek bir 1 ms adım (işletim sistemi kesintisi) %99,9 şartını bozmaz: GEÇTİ', () => {
    const m = new Metrics(10);
    feed(m, 1000 / 60, 600);
    for (let i = 0; i < 600; i++) m.simStep();
    for (let i = 0; i < 36_000; i++) m.stepTime(0.1);
    m.stepTime(1.0);
    m.rollbackTime(0.5, 8);
    expect(m.summary().verdict).toBe('GEÇTİ');
  });

  test('adımların binde birinden fazlası 1 ms ve üstüyse KALDI', () => {
    const m = new Metrics(10);
    feed(m, 1000 / 60, 600);
    for (let i = 0; i < 600; i++) m.simStep();
    for (let i = 0; i < 997; i++) m.stepTime(0.1);
    for (let i = 0; i < 3; i++) m.stepTime(1.2);
    expect(m.summary().verdict).toBe('KALDI');
  });

  test('düşen kareler zamanı ve süresiyle kaydedilir (en çok 100)', () => {
    const m = new Metrics(100);
    warm(m);
    m.frame(34);
    const s = m.summary();
    expect(s.drops).toEqual([{ at: Number(((120 * 1000) / 60 / 1000 + 0.034).toFixed(2)), ms: 34 }]);
    for (let i = 0; i < 150; i++) m.frame(40);
    expect(m.summary().drops).toHaveLength(100);
    expect(m.summary().dropped).toBe(151);
  });

  test('kare başına iş süresinin en uzunu ısınmadan sonra tutulur', () => {
    const m = new Metrics(10);
    m.work(12);
    warm(m);
    m.work(1.5);
    m.work(0.7);
    expect(m.summary().maxWorkMs).toBe(1.5);
  });
});

test('kontrol ölçümü (yalnız kareler): simülasyon olmadan sonuç yalnız düşen kareye bakar', () => {
  const m = new Metrics(10, { framesOnly: true });
  feed(m, 1000 / 60, 600);
  expect(m.summary().verdict).toBe('GEÇTİ');
  m.frame(40);
  expect(m.summary().verdict).toBe('KALDI');
  expect(m.frameCount).toBe(601);
});
