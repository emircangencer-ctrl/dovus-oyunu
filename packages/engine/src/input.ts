/** Bir karenin girdisi: yönler ve dört saldırı tuşu tek bir bit maskesinde. */
export const UP = 1;
export const DOWN = 2;
export const LEFT = 4;
export const RIGHT = 8;
export const LP = 16;
export const HP = 32;
export const LK = 64;
export const HK = 128;

/** Zıt yönler aynı anda basılıysa nötr sayılır (spec 5.4). */
export function cleanInput(i: number): number {
  let v = i & 0xff;
  if ((v & (LEFT | RIGHT)) === (LEFT | RIGHT)) v &= ~(LEFT | RIGHT);
  if ((v & (UP | DOWN)) === (UP | DOWN)) v &= ~(UP | DOWN);
  return v;
}
