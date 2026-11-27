import { type FightState, INTRO_FIGHT_AT, initialState, PHASE } from '@dovus/fight';
import { describe, expect, test } from 'vitest';
import { announcement } from './hud';

const names = { p1: 'OYUNCU 1', p2: 'KUKLA' };
const at = (patch: Partial<FightState>): FightState => ({ ...initialState({ seed: 1 }), ...patch });

describe('raunt duyuruları', () => {
  test('giriş: önce RAUNT n, sonra DÖVÜŞ!; iki taraf da bir raunttaysa SON RAUNT', () => {
    expect(announcement(at({ phase: PHASE.INTRO, phaseFrame: 0, round: 2 }), names)).toEqual(['RAUNT 2', '']);
    expect(announcement(at({ phase: PHASE.INTRO, phaseFrame: INTRO_FIGHT_AT }), names)).toEqual(['DÖVÜŞ!', '']);
    expect(announcement(at({ phase: PHASE.INTRO, phaseFrame: 0, round: 3, wins: [1, 1] }), names)[0]).toBe('SON RAUNT');
  });

  test('raunt sonu: K.O., SÜRE BİTTİ, ÇİFT K.O.; kimin aldığı alt satırda', () => {
    expect(announcement(at({ phase: PHASE.ROUND_END, roundResult: 1, roundReason: 0 }), names)).toEqual([
      'K.O.',
      'OYUNCU 1 RAUNDU ALDI',
    ]);
    expect(announcement(at({ phase: PHASE.ROUND_END, roundResult: 2, roundReason: 1 }), names)).toEqual([
      'SÜRE BİTTİ',
      'KUKLA RAUNDU ALDI',
    ]);
    expect(announcement(at({ phase: PHASE.ROUND_END, roundResult: 3, roundReason: 0 }), names)).toEqual([
      'ÇİFT K.O.',
      'BERABERE',
    ]);
  });

  test('maç sonu: kazanan ve skor; berabere maç; dövüşte duyuru yok', () => {
    expect(announcement(at({ phase: PHASE.MATCH_END, winner: 1, wins: [1, 2] }), names)).toEqual([
      'KUKLA KAZANDI',
      '1 – 2',
    ]);
    expect(announcement(at({ phase: PHASE.MATCH_END, winner: 2, wins: [2, 2] }), names)[0]).toBe('BERABERE');
    expect(announcement(at({ phase: PHASE.FIGHT }), names)).toEqual(['', '']);
  });
});
