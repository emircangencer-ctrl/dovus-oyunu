import { DOWN, HK, HP, LEFT, LK, LP, RIGHT, UP } from '@dovus/engine';
import { describe, expect, test } from 'vitest';
import { keyboardBits, type PadLike, padBits, padEdges, padPressed } from './controls';

const pad = (pressed: number[] = [], axes: [number, number] = [0, 0]): PadLike => ({
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i) })),
  axes,
});

describe('klavye (Oyuncu 1)', () => {
  test('WASD ve oklar yön; U J I K = A B C D (Hafif Yumruk, Hafif Tekme, Ağır Yumruk, Ağır Tekme)', () => {
    expect(keyboardBits(new Set(['KeyW', 'KeyD']))).toBe(UP | RIGHT);
    expect(keyboardBits(new Set(['ArrowDown', 'ArrowLeft']))).toBe(DOWN | LEFT);
    expect(keyboardBits(new Set(['KeyU', 'KeyJ', 'KeyI', 'KeyK']))).toBe(LP | LK | HP | HK);
    expect(keyboardBits(new Set(['KeyQ', 'Enter']))).toBe(0);
  });
});

describe('oyun kolu (PlayStation standart eşleme)', () => {
  test('□ A, × B, △ C, ○ D; yön tuşları ve sol çubuk', () => {
    expect(padBits(pad([2]))).toBe(LP);
    expect(padBits(pad([0]))).toBe(LK);
    expect(padBits(pad([3]))).toBe(HP);
    expect(padBits(pad([1]))).toBe(HK);
    expect(padBits(pad([12, 15]))).toBe(UP | RIGHT);
    expect(padBits(pad([], [-0.9, 0.8]))).toBe(LEFT | DOWN);
    expect(padBits(pad([], [0.3, -0.3]))).toBe(0);
  });

  test('basış anı: önceki karede basılı olmayan tuşlar', () => {
    expect(padEdges(pad([0]), pad([0, 9]))).toEqual([9]);
    expect(padPressed(pad([0]), pad([0, 9]), [9])).toBe(true);
    expect(padPressed(pad([9]), pad([9]), [9])).toBe(false);
    expect(padPressed(undefined, pad([2]), [0, 1, 2, 3])).toBe(true);
  });
});
