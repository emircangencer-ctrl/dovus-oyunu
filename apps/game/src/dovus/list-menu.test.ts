import { describe, expect, test } from 'vitest';
import { listMenu, listStep } from './list-menu';

describe('liste menüsü (duraklatma ve maç sonu)', () => {
  const items = ['DEVAM ET', 'BAŞTAN BAŞLA', 'ANA MENÜYE DÖN'] as const;

  test('ilk seçenek odaklı açılır; aşağı/yukarı uçlarda sarar', () => {
    const m = listMenu(items);
    expect(m.focus).toBe(0);
    expect(listStep(m, 'asagi').menu.focus).toBe(1);
    expect(listStep(m, 'yukari').menu.focus).toBe(2);
  });

  test('onay seçili sırayı, geri "geri" sonucunu verir', () => {
    const m = listStep(listMenu(items), 'asagi').menu;
    expect(listStep(m, 'sec').chosen).toBe(1);
    expect(listStep(m, 'geri').back).toBe(true);
    expect(listStep(m, 'asagi').chosen).toBeUndefined();
  });

  test('fareyle odak ve tıklama', () => {
    const m = listMenu(items);
    expect(listStep(m, { odak: 2 }).menu.focus).toBe(2);
    expect(listStep(m, { tikla: 1 }).chosen).toBe(1);
    expect(listStep(m, { odak: 9 }).menu.focus).toBe(0);
  });
});
