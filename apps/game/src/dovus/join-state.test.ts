import { describe, expect, test } from 'vitest';
import { joinStart, joinStep } from './join-state';

describe('Versus katılma', () => {
  test('ilk basan Oyuncu 1, başka cihazdan basan Oyuncu 2; ikisi gelince başlar', () => {
    let s = joinStart('versus');
    s = joinStep(s, { bas: 'klavye' });
    expect(s.p1).toBe('klavye');
    expect(s.ready).toBe(false);
    s = joinStep(s, { bas: 'klavye' });
    expect(s.p2).toBeNull();
    s = joinStep(s, { bas: 'kol0' });
    expect(s.p2).toBe('kol0');
    expect(s.ready).toBe(true);
  });

  test('Oyuncu 1 onaylarsa (Enter / Options) Oyuncu 2 kukla olur', () => {
    let s = joinStep(joinStart('versus'), { bas: 'kol0' });
    s = joinStep(s, { onay: 'kol0' });
    expect(s.p2).toBe('kukla');
    expect(s.ready).toBe(true);
  });

  test('katılmamış cihazın onayı da katılmadır', () => {
    const s = joinStep(joinStart('versus'), { onay: 'klavye' });
    expect(s.p1).toBe('klavye');
    expect(s.p2).toBeNull();
  });

  test('geri: önce Oyuncu 2, sonra Oyuncu 1 çıkar, sonra menüye döner', () => {
    let s = joinStep(joinStep(joinStart('versus'), { bas: 'klavye' }), { bas: 'kol0' });
    s = joinStep(s, { geri: 'kol0' });
    expect(s.p2).toBeNull();
    s = joinStep(s, { geri: 'klavye' });
    expect(s.p1).toBeNull();
    expect(s.exit).toBe(false);
    s = joinStep(s, { geri: 'klavye' });
    expect(s.exit).toBe(true);
  });
});

describe('Antrenman katılma', () => {
  test('tek oyuncu yeter; rakip kukla', () => {
    const s = joinStep(joinStart('antrenman'), { bas: 'kol1' });
    expect(s.p1).toBe('kol1');
    expect(s.p2).toBe('kukla');
    expect(s.ready).toBe(true);
  });
});
