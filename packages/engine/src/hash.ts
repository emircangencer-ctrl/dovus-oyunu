/** FNV-1a 32 bit; her değer int32 olarak küçük uçlu 4 bayt işlenir. Durum özetlerini tarayıcılar arası karşılaştırmak için. */
export function hashInts(values: Iterable<number>, seed = 0x811c9dc5): number {
  let h = seed >>> 0;
  for (const raw of values) {
    const v = raw | 0;
    for (let i = 0; i < 4; i++) {
      h ^= (v >>> (8 * i)) & 0xff;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  }
  return h >>> 0;
}
