import { describe, expect, test } from 'vitest';
import { FX, toFx } from './fixed';
import { cleanInput, DOWN, HP, LEFT, LP, RIGHT, UP } from './input';
import { boxes, FIGHTER_W, type Fighter, FLOOR_Y, initialState, type SimState, step } from './sim';

const run = (s: SimState, frames: number, p1 = 0, p2 = 0): SimState => {
  let cur = s;
  for (let i = 0; i < frames; i++) cur = step(cur, [p1, p2]);
  return cur;
};

/** İki dövüşçüyü verilen taban piksel konumlarına koyar. */
const placed = (x1: number, x2: number): SimState => {
  const s = initialState(1);
  const [a, b] = s.fighters;
  return {
    ...s,
    fighters: [
      { ...a, x: toFx(x1) },
      { ...b, x: toFx(x2) },
    ],
  };
};

describe('girdi', () => {
  test('aynı anda sol+sağ ve yukarı+aşağı nötr sayılır', () => {
    expect(cleanInput(LEFT | RIGHT | LP)).toBe(LP);
    expect(cleanInput(UP | DOWN | RIGHT)).toBe(RIGHT);
  });
});

describe('hareket', () => {
  test('sağ basılıyken her karede 3 taban pikseli ilerler', () => {
    const s = placed(200, 700);
    const after = run(s, 10, RIGHT);
    expect(after.fighters[0].x - s.fighters[0].x).toBe(toFx(30));
  });

  test('zıplama yerden kalkar, yaklaşık 130 piksel yükselir ve 36–39 karede yere iner', () => {
    let s = placed(200, 700);
    s = step(s, [UP, 0]);
    let top = s.fighters[0].y;
    let frames = 1;
    while (s.fighters[0].y < toFx(FLOOR_Y) && frames < 100) {
      s = step(s, [0, 0]);
      top = Math.min(top, s.fighters[0].y);
      frames++;
    }
    const rise = (toFx(FLOOR_Y) - top) / FX;
    expect(rise).toBeGreaterThan(122);
    expect(rise).toBeLessThan(138);
    expect(frames).toBeGreaterThanOrEqual(36);
    expect(frames).toBeLessThanOrEqual(39);
    expect(s.fighters[0].state).toBe(0);
  });

  test('itme kutusu: iki dövüşçü iç içe geçmez', () => {
    const s = run(placed(400, 470), 30, RIGHT, LEFT);
    const [a, b] = s.fighters;
    expect(Math.abs(b.x - a.x)).toBeGreaterThanOrEqual(toFx(FIGHTER_W));
  });

  test('dövüşçüler hep birbirine döner', () => {
    const s = step(placed(700, 200), [0, 0]);
    expect(s.fighters[0].facing).toBe(-1);
    expect(s.fighters[1].facing).toBe(1);
  });

  test('sahne kenarından dışarı çıkılmaz', () => {
    const s = run(placed(100, 700), 60, LEFT);
    expect(s.fighters[0].x).toBe(toFx(30 + FIGHTER_W / 2));
  });
});

describe('vuruş', () => {
  test('hafif yumruk basıştan sonraki 4. karede etkinleşir, 50 hasar ve 14 kare sersemletme verir', () => {
    let s = placed(400, 470);
    s = step(s, [LP, 0]); // basış karesi
    s = run(s, 3); // 3 kare daha: henüz etkin değil
    expect(s.fighters[1].hp).toBe(1000);
    s = step(s, [0, 0]); // 4. kare: etkin
    expect(s.fighters[1].hp).toBe(950);
    expect(s.fighters[1].hitstun).toBe(14);
    expect(boxes(s.fighters[0]).hit).not.toBeNull();
  });

  test('basılı tutulan tuş tekrar vurmaz; vuruş tek sefer işler', () => {
    const s = run(placed(400, 470), 40, LP);
    expect(s.fighters[1].hp).toBe(950);
  });

  test('ağır yumruk 100 hasar ve 20 kare sersemletme', () => {
    let s = placed(400, 470);
    s = step(s, [HP, 0]);
    s = run(s, 8);
    expect(s.fighters[1].hp).toBe(900);
    expect(s.fighters[1].hitstun).toBe(20);
  });

  test('menzil dışında vuruş boşa gider', () => {
    const s = run(step(placed(200, 700), [LP, 0]), 20);
    expect(s.fighters[1].hp).toBe(1000);
  });

  test('step girdiği durumu değiştirmez', () => {
    const s = placed(400, 470);
    const snapshot = JSON.stringify(s);
    step(s, [LP | RIGHT, UP]);
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  test('can 0 olunca dövüşçü yere düşer (KO) ve artık hareket etmez', () => {
    let s = placed(400, 470);
    const weak: Fighter = { ...s.fighters[1], hp: 50 };
    s = { ...s, fighters: [s.fighters[0], weak] };
    s = run(step(s, [LP, 0]), 5);
    expect(s.fighters[1].hp).toBe(0);
    expect(s.fighters[1].state).toBe(5);
    const x = s.fighters[1].x;
    expect(run(s, 30, 0, RIGHT).fighters[1].x).toBe(x);
  });
});
