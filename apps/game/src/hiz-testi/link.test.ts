import { hashState, initialState, RollbackSession, randomInputs, type SimState, step } from '@dovus/engine';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { DelayedLink, type LinkChannel, type LinkMessage, LinkPeer } from './link';

/** Birbirine bağlı iki sahte kanal (BroadcastChannel yerine). */
function channelPair(): [LinkChannel, LinkChannel] {
  const a: LinkChannel = { onmessage: null, postMessage: (m) => b.onmessage?.({ data: m }) };
  const b: LinkChannel = { onmessage: null, postMessage: (m) => a.onmessage?.({ data: m }) };
  return [a, b];
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('gecikmeli bağlantı', () => {
  test('mesaj gecikme ± 20 ms sonra ulaşır', () => {
    const [ca, cb] = channelPair();
    let r = 0;
    const seq = [0, 0.5, 0.999];
    const link = new DelayedLink(ca, 150, () => seq[r++ % seq.length] ?? 0);
    const got: Array<[unknown, number]> = [];
    const other = new DelayedLink(cb, 0, () => 0.5);
    other.onReceive((m) => got.push([m, Date.now()]));
    const t0 = Date.now();
    link.send('a'); // 150 - 20
    link.send('b'); // 150 + 0
    link.send('c'); // 150 + 20
    vi.advanceTimersByTime(129);
    expect(got).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(got.map((g) => g[0])).toEqual(['a']);
    vi.advanceTimersByTime(40);
    expect(got.map((g) => [g[0], g[1] - t0])).toEqual([
      ['a', 130],
      ['b', 150],
      ['c', 170],
    ]);
  });
});

describe('iki taraf 150 ms gecikmeyle', () => {
  test('3.000 kare boyunca kesinleşmiş durum özetleri hep aynı ve tek tarayıcıdaki oyunla aynı', () => {
    const [ca, cb] = channelPair();
    let seed = 1;
    const rnd = (): number => {
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
      return seed / 2 ** 32;
    };
    const frames = 3000;
    const ins = randomInputs(42, frames + 10);
    const peers = [0, 1].map((p) => {
      const session = new RollbackSession({ seed: 42, local: p as 0 | 1, maxRollback: 8, delay: 2 });
      const link = new DelayedLink(p === 0 ? ca : cb, 150, rnd);
      return new LinkPeer(session, link, (f) => (ins[f] as [number, number])[p] ?? 0);
    });
    const mismatches: string[] = [];
    for (const peer of peers) peer.onMismatch = (f) => mismatches.push(`kare ${f}`);
    for (let t = 0; t < 60_000 && peers.some((p) => p.session.confirmedFrame < frames); t++) {
      for (const peer of peers) peer.tick();
      vi.advanceTimersByTime(1000 / 60);
    }
    expect(mismatches).toEqual([]);
    const [a, b] = peers as [LinkPeer, LinkPeer];
    expect(a.compared).toBeGreaterThan(40);
    let plain: SimState = initialState(42);
    for (let f = 0; f < frames; f++) plain = step(plain, ins[f] as [number, number]);
    // Girdi kaynağı uygulanacağı kareyle çağrılır; bu yüzden iki taraflı oyun tek tarayıcıdaki oyunla birebir aynı olmalı.
    expect(a.session.confirmedHash(frames - 1)).toBe(b.session.confirmedHash(frames - 1));
    expect(a.session.confirmedHash(frames - 1)).toBe(hashState(plain));
  });
});

test('mesaj biçimi', () => {
  const m: LinkMessage = { t: 'girdi', from: 0, frame: 5, inputs: [1, 2] };
  expect(m.t).toBe('girdi');
});
