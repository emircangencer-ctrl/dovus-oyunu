/** Tohumlu xorshift32 (13, 17, 5). Simülasyonda Math.random yerine kullanılır; her tarayıcıda aynı diziyi verir. */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0 || 0x9e3779b9;
  }

  next(): number {
    let x = this.s;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.s = x >>> 0;
    return this.s;
  }

  /** [0, n) aralığında tam sayı. */
  int(n: number): number {
    return this.next() % n;
  }

  get seed(): number {
    return this.s;
  }
}
