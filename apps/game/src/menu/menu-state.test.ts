import { describe, expect, test } from 'vitest';
import { INITIAL, MENU_ITEMS, type MenuState, menuAt, step } from './menu-state';

const menu = (focus = 0): MenuState => ({ screen: 'menu', focus, toast: null, launch: null });

describe('başlık ekranı', () => {
  test('oyun başlık ekranıyla açılır', () => {
    expect(INITIAL).toEqual({ screen: 'baslik', focus: 0, toast: null, launch: null });
  });

  test.each(['herhangi', 'sec', 'yukari', 'asagi'] as const)('"%s" ana menüyü açar', (action) => {
    expect(step(INITIAL, action).screen).toBe('menu');
  });

  test('tıklamak da ana menüyü açar', () => {
    expect(step(INITIAL, { tikla: 3 })).toEqual(menu(0));
  });

  test('geri başlık ekranında bir şey yapmaz', () => {
    expect(step(INITIAL, 'geri')).toBe(INITIAL);
  });
});

describe('ana menü', () => {
  test("7 seçenek; karakter tasarımı oyuncu menüsünde yok (yalnız Emir'in yönetim panelinde)", () => {
    expect(MENU_ITEMS.map((i) => i.label)).toEqual([
      'ARCADE',
      'VERSUS',
      'ÇEVRİMİÇİ OYNA',
      'TURNUVA',
      'ANTRENMAN',
      'PROFİL VE SIRALAMA',
      'AYARLAR',
    ]);
    expect(MENU_ITEMS.some((i) => i.id === 'studyo')).toBe(false);
  });

  test('aşağı ve yukarı odağı taşır; uçlarda başa ve sona sarar', () => {
    expect(step(menu(0), 'asagi').focus).toBe(1);
    expect(step(menu(MENU_ITEMS.length - 1), 'asagi').focus).toBe(0);
    expect(step(menu(0), 'yukari').focus).toBe(MENU_ITEMS.length - 1);
  });

  test('hazır olmayan seçenek seçilince YAKINDA bildirimi çıkar, her seçişte yeni kimlikle', () => {
    const once = step(menu(2), 'sec');
    expect(once.toast?.text).toBe('ÇEVRİMİÇİ OYNA · YAKINDA');
    const twice = step(once, 'sec');
    expect(twice.toast?.id).toBe((once.toast?.id ?? 0) + 1);
    expect(twice.screen).toBe('menu');
  });

  test('üzerine gelmek odağı taşır, tıklamak hem odaklar hem seçer', () => {
    expect(step(menu(0), { odak: 5 })).toEqual(menu(5));
    const clicked = step(menu(0), { tikla: 3 });
    expect(clicked.focus).toBe(3);
    expect(clicked.toast?.text).toBe('TURNUVA · YAKINDA');
  });

  test('VERSUS ve ANTRENMAN hazır: seçilince açılır (her seçişte yeni kimlik), bildirim çıkmaz', () => {
    const v = step(menu(1), 'sec');
    expect(v.launch).toEqual({ id: 'versus', n: 1 });
    expect(v.toast).toBeNull();
    expect(step(v, 'sec').launch).toEqual({ id: 'versus', n: 2 });
    expect(step(menu(0), { tikla: 4 }).launch).toEqual({ id: 'antrenman', n: 1 });
    expect(MENU_ITEMS.filter((i) => i.ready).map((i) => i.id)).toEqual(['versus', 'antrenman']);
  });

  test('dövüşten dönünce menü aynı seçenekte açılır', () => {
    expect(menuAt('antrenman')).toEqual(menu(4));
  });

  test('menü dışındaki bir sıraya odak verilemez', () => {
    expect(step(menu(1), { odak: 99 })).toEqual(menu(1));
    expect(step(menu(1), { tikla: -1 })).toEqual(menu(1));
  });

  test('geri başlık ekranına döner ve bildirimi kapatır', () => {
    const withToast = step(menu(2), 'sec');
    expect(step(withToast, 'geri')).toEqual({ screen: 'baslik', focus: 2, toast: null, launch: null });
  });

  test('"herhangi" ana menüde bir şey yapmaz', () => {
    const s = menu(3);
    expect(step(s, 'herhangi')).toBe(s);
  });
});
