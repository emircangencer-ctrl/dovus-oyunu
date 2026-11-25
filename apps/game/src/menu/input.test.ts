import { describe, expect, test } from 'vitest';
import { keyToAction, NO_PAD, type PadSnapshot, padStep } from './input';

describe('klavye', () => {
  test.each([
    ['ArrowUp', 'yukari'],
    ['w', 'yukari'],
    ['W', 'yukari'],
    ['ArrowDown', 'asagi'],
    ['s', 'asagi'],
    ['Enter', 'sec'],
    [' ', 'sec'],
    ['Escape', 'geri'],
    ['Backspace', 'geri'],
    ['x', 'herhangi'],
    ['ArrowLeft', 'herhangi'],
  ])('%s → %s', (key, action) => {
    expect(keyToAction(key)).toBe(action);
  });

  test.each(['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'F5', 'F12', 'CapsLock'])('%s yok sayılır', (key) => {
    expect(keyToAction(key)).toBeNull();
  });
});

describe('oyun kolu', () => {
  const pad = (p: Partial<PadSnapshot>): PadSnapshot => ({ ...NO_PAD, ...p });

  test('basış anında bir eylem; basılı tutmak 300 ms sonra, ardından her 120 ms tekrarlar', () => {
    let mem = padStep(undefined, pad({}), 0).mem;
    const at = (t: number, p: Partial<PadSnapshot>) => {
      const r = padStep(mem, pad(p), t);
      mem = r.mem;
      return r.actions;
    };
    expect(at(16, { down: true })).toEqual(['asagi']);
    expect(at(32, { down: true })).toEqual([]);
    expect(at(300, { down: true })).toEqual([]);
    expect(at(316, { down: true })).toEqual(['asagi']);
    expect(at(400, { down: true })).toEqual([]);
    expect(at(436, { down: true })).toEqual(['asagi']);
    expect(at(450, {})).toEqual([]);
    expect(at(466, { down: true })).toEqual(['asagi']);
  });

  test('A seçer, B geri gider, Start seçer; yalnızca basış anında', () => {
    let mem = padStep(undefined, pad({}), 0).mem;
    const at = (t: number, p: Partial<PadSnapshot>) => {
      const r = padStep(mem, pad(p), t);
      mem = r.mem;
      return r.actions;
    };
    expect(at(10, { a: true })).toEqual(['sec']);
    expect(at(1000, { a: true })).toEqual([]);
    expect(at(1010, { b: true })).toEqual(['geri']);
    expect(at(1020, { start: true })).toEqual(['sec']);
    expect(at(1030, { other: true })).toEqual(['herhangi']);
  });

  test('kol takılı değilken hiçbir şey olmaz', () => {
    const r = padStep(undefined, NO_PAD, 0);
    expect(r.actions).toEqual([]);
  });
});
