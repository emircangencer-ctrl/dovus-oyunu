import { DOWN, HK, HP, LEFT, LK, LP, RIGHT, toFx, UP } from '@dovus/engine';
import { describe, expect, test } from 'vitest';
import { hurtbox } from './boxes';
import { KUKLA } from './kukla';
import { initialState, step } from './sim';
import { STAGE_RIGHT } from './stage';
import { type Fighter, type FightState, ST } from './types';

const BTN = [LP, LK, HP, HK] as const; // A B C D
const atk = (i: number) => {
  const a = KUKLA.attacks[i];
  if (!a) throw new Error(`saldırı ${i} yok`);
  return a;
};
const start = (ax = 600, bx = 670): FightState => {
  const s = initialState({ seed: 1, intro: false });
  const [a, b] = s.fighters;
  return {
    ...s,
    fighters: [
      { ...a, x: toFx(ax) },
      { ...b, x: toFx(bx) },
    ],
  };
};
const play = (s: FightState, frames: number, input: (k: number, cur: FightState) => [number, number]): FightState[] => {
  const out: FightState[] = [];
  let cur = s;
  for (let k = 0; k < frames; k++) {
    cur = step(cur, input(k, cur));
    out.push(cur);
  }
  return out;
};
const at = (frames: FightState[], k: number): FightState => frames[k] as FightState;
const p1 = (s: FightState): Fighter => s.fighters[0];
const p2 = (s: FightState): Fighter => s.fighters[1];
const last = (frames: FightState[]): FightState => frames[frames.length - 1] as FightState;

describe('tuşlar ve duruşlar', () => {
  test('ayakta, çömelik ve havada her tuş eşlenen normal vuruşu başlatır', () => {
    BTN.forEach((b, i) => {
      const st = at(
        play(start(300, 900), 1, () => [b, 0]),
        0,
      );
      expect(p1(st).state).toBe(ST.ATTACK);
      expect(p1(st).attack).toBe(KUKLA.normals.st[i]);
      const cr = at(
        play(start(300, 900), 2, (k) => [k === 0 ? DOWN : DOWN | b, 0]),
        1,
      );
      expect(p1(cr).attack).toBe(KUKLA.normals.cr[i]);
      const air = play(start(300, 900), 12, (k) => [k < 6 ? UP : k === 10 ? b : 0, 0]);
      expect(p1(at(air, 10)).state).toBe(ST.AIR_ATTACK);
      expect(p1(at(air, 10)).attack).toBe(KUKLA.normals.air[i]);
    });
  });

  test('basılı tutmak yeniden vurmaz: yalnız basış anı sayılır', () => {
    const frames = play(start(300, 900), 40, () => [LP, 0]);
    const starts = frames.filter((f, k) => k > 0 && p1(f).state === ST.ATTACK && p1(f).stateFrame === 0);
    expect(starts).toHaveLength(0);
  });
});

describe('isabet', () => {
  test('ilk aktif karede isabet eder ve saldırı başına bir kez hasar verir', () => {
    const c = atk(KUKLA.normals.st[2]);
    const frames = play(start(600, 700), 60, (k) => [k === 0 ? HP : 0, 0]);
    expect(p2(at(frames, c.startup - 1)).hp).toBe(KUKLA.health);
    expect(p2(at(frames, c.startup)).hp).toBe(KUKLA.health - c.damage);
    expect(p2(at(frames, c.startup)).state).toBe(ST.HIT_ST);
    expect(p2(last(frames)).hp).toBe(KUKLA.health - c.damage);
    expect(p2(last(frames)).state).toBe(ST.IDLE);
  });

  test('uzaktan boşa vurulan vuruş hasar vermez', () => {
    const frames = play(start(300, 700), 40, (k) => [k === 0 ? HP : 0, 0]);
    expect(p2(last(frames)).hp).toBe(KUKLA.health);
  });

  test('aynı karede iki taraf da vurursa ikisi de hasar alır (takas)', () => {
    const a = atk(KUKLA.normals.st[0]);
    const f = at(
      play(start(600, 680), a.startup + 1, (k) => (k === 0 ? [LP, LP] : [0, 0])),
      a.startup,
    );
    expect(p1(f).hp).toBe(KUKLA.health - a.damage);
    expect(p2(f).hp).toBe(KUKLA.health - a.damage);
  });
});

describe('blok', () => {
  const sweepish = (guardInput: number, attackInput: (k: number) => number) =>
    play(start(600, 690), 40, (k) => [attackInput(k), guardInput]);

  test('alçak vuruş ayakta bloklanamaz, çömelik bloklanır', () => {
    const lowB = (k: number): number => (k === 0 ? DOWN : k === 1 ? DOWN | LK : DOWN);
    expect(p2(last(sweepish(RIGHT, lowB))).hp).toBeLessThan(KUKLA.health);
    const blocked = sweepish(DOWN | RIGHT, lowB);
    expect(p2(last(blocked)).hp).toBe(KUKLA.health);
    expect(blocked.some((f) => p2(f).state === ST.BLOCK_CR)).toBe(true);
  });

  test('havadan vuruş çömelik bloklanamaz, ayakta bloklanır', () => {
    // İnişte, alçakta aktif olan hava ağır tekmesi; savunan son anda tutar (geri yürüyüp kaçmasın).
    const jumpIn = (k: number): number => (k < 6 ? UP | RIGHT : k === 29 ? HK : 0);
    const frames = (guard: number) => play(start(420, 640), 70, (k) => [jumpIn(k), k >= 30 ? guard : 0]);
    expect(p2(last(frames(DOWN | RIGHT))).hp).toBeLessThan(KUKLA.health);
    const blocked = frames(RIGHT);
    expect(p2(last(blocked)).hp).toBe(KUKLA.health);
    expect(blocked.some((f) => p2(f).state === ST.BLOCK_ST)).toBe(true);
  });

  test('orta vuruş iki türlü de bloklanır; blok hasar vermez ve sersemletme süresi kadar sürer', () => {
    // Ayakta hafif tekme: orta yükseklikte, çömelene de yetişir (ayakta hafif yumruk çömelenin üstünden geçer).
    const a = atk(KUKLA.normals.st[1]);
    for (const guard of [RIGHT, DOWN | RIGHT]) {
      const frames = play(start(600, 680), 40, (k) => [k === 0 ? LK : 0, guard]);
      const hitAt = frames.findIndex((f) => p2(f).state === ST.BLOCK_ST || p2(f).state === ST.BLOCK_CR);
      expect(hitAt).toBe(a.startup);
      expect(p2(at(frames, hitAt)).stun).toBe(a.blockstun);
      expect(p2(last(frames)).hp).toBe(KUKLA.health);
    }
  });
});

describe('vuruş donması ve zincir', () => {
  test('temasla ikisi de donar; donma sırasında basılan hafif tuş donma bitince zinciri başlatır', () => {
    const a = atk(KUKLA.normals.st[0]);
    const frames = play(start(600, 670), 40, (k) => [k === 0 || k === a.startup + 2 ? LP : 0, 0]);
    const hit = at(frames, a.startup);
    expect(hit.hitstop).toBe(a.hitstop);
    const frozen = at(frames, a.startup + 3);
    expect(p1(frozen).stateFrame).toBe(p1(hit).stateFrame);
    expect(p2(frozen).x).toBe(p2(hit).x);
    expect(p2(frozen).stun).toBe(p2(hit).stun);
    const resumed = at(frames, a.startup + a.hitstop + 1);
    expect(p1(resumed).state).toBe(ST.ATTACK);
    expect(p1(resumed).stateFrame).toBe(0);
    expect(p1(resumed).contact).toBe(0);
  });

  test('boşa giden hafif vuruş zincirlenmez', () => {
    const a = atk(KUKLA.normals.st[0]);
    const frames = play(start(300, 900), 30, (k) => [k === 0 || k === a.startup + 2 ? LP : 0, 0]);
    expect(p1(at(frames, a.startup + 2)).stateFrame).toBe(a.startup + 2);
  });

  test('üç hafif yumruk kombo: sayaç 3, hasar 100/100/90 %, toplam hasar tutulur; kombo bitince sıfırlanır', () => {
    const a = atk(KUKLA.normals.st[0]);
    let presses = 0;
    const frames = play(start(600, 670), 90, (k, cur) => {
      const me = p1(cur);
      const want = presses < 3 && (k === 0 || (me.contact === 1 && cur.hitstop > 0));
      if (want && (k === 0 || cur.hitstop === 1)) {
        presses += 1;
        return [LP, 0];
      }
      return [0, 0];
    });
    const best = Math.max(...frames.map((f) => p2(f).combo));
    expect(best).toBe(3);
    const third = frames.find((f) => p2(f).combo === 3) as FightState;
    expect(p2(third).comboDamage).toBe(a.damage + a.damage + Math.trunc((a.damage * 90) / 100));
    expect(p2(third).hp).toBe(KUKLA.health - p2(third).comboDamage);
    expect(p2(last(frames)).combo).toBe(0);
  });
});

describe('itme, hava ve yere düşme', () => {
  test('ortada savunan geri itilir; köşede itme saldırana aktarılır', () => {
    const c = atk(KUKLA.normals.st[2]);
    const mid = play(start(600, 700), 40, (k) => [k === 0 ? HP : 0, 0]);
    expect(p2(last(mid)).x - toFx(700)).toBe(toFx(c.push));
    expect(p1(last(mid)).x).toBe(toFx(600));

    const corner = play(start(STAGE_RIGHT - 100, STAGE_RIGHT), 40, (k) => [k === 0 ? HP : 0, 0]);
    expect(p2(last(corner)).x).toBe(toFx(STAGE_RIGHT));
    expect(toFx(STAGE_RIGHT - 100) - p1(last(corner)).x).toBe(toFx(c.push));
  });

  test('havadayken vurulan savrulur, düşerken vurulamaz, ayakları üstüne iner', () => {
    const frames = play(start(600, 680), 80, (k) => [k === 3 ? HP : 0, k < 6 ? UP : 0]);
    const air = frames.findIndex((f) => p2(f).state === ST.HIT_AIR);
    expect(air).toBeGreaterThan(0);
    expect(hurtbox(p2(at(frames, air)), KUKLA)).toBeNull();
    const after = frames.slice(air).map((f) => p2(f).state);
    expect(after).toContain(ST.LANDING);
    expect(after).not.toContain(ST.KNOCKDOWN);
    expect(p2(last(frames)).state).toBe(ST.IDLE);
  });

  test('süpürme yere düşürür; kalkarken dokunulmaz, sonra serbest', () => {
    const frames = play(start(600, 700), 120, (k) => [k === 0 ? DOWN : k === 1 ? DOWN | HK : 0, 0]);
    const down = frames.findIndex((f) => p2(f).state === ST.KNOCKDOWN);
    expect(down).toBeGreaterThan(0);
    const wake = frames.findIndex((f) => p2(f).state === ST.WAKEUP);
    expect(wake).toBeGreaterThan(down);
    expect(hurtbox(p2(at(frames, wake)), KUKLA)).toBeNull();
    expect(p2(last(frames)).state).toBe(ST.IDLE);
  });

  test('geri tutmak saldırı yokken bloklamaz, geri yürür', () => {
    const frames = play(start(600, 900), 10, () => [0, RIGHT]);
    expect(p2(last(frames)).state).toBe(ST.WALK_B);
    expect(p2(last(frames)).x).toBeGreaterThan(toFx(900));
  });

  test('ayakta hafif yumruk çömelenin üstünden geçer', () => {
    const frames = play(start(600, 670), 30, (k) => [k === 0 ? LP : 0, DOWN]);
    expect(p2(last(frames)).hp).toBe(KUKLA.health);
  });

  test('sol+sağ birlikte basılıyken tuş yine vurur', () => {
    expect(p1(last(play(start(), 3, () => [LEFT | RIGHT | LP, 0]))).state).toBe(ST.ATTACK);
  });
});
