import type { Device } from './controls';

/** Oyuncu katılımı: Versus'ta ilk basan cihaz Oyuncu 1, başka bir cihazdan basan Oyuncu 2 (ya da Oyuncu 1 onaylayınca
 *  kukla). Antrenman'da tek oyuncu yeter, rakip kukladır. */

export type Mode = 'versus' | 'antrenman';
export type Seat = Device | 'kukla';

export interface JoinState {
  readonly mode: Mode;
  readonly p1: Device | null;
  readonly p2: Seat | null;
  readonly ready: boolean;
  /** Kimse yokken geri: menüye dön. */
  readonly exit: boolean;
}

export type JoinAction = { readonly bas: Device } | { readonly onay: Device } | { readonly geri: Device };

export const joinStart = (mode: Mode): JoinState => ({ mode, p1: null, p2: null, ready: false, exit: false });

const settle = (s: Omit<JoinState, 'ready'>): JoinState => ({ ...s, ready: s.p1 !== null && s.p2 !== null });

export function joinStep(s: JoinState, a: JoinAction): JoinState {
  if (s.exit) return s;
  if ('geri' in a) {
    if (s.p2 !== null && s.mode === 'versus') return settle({ ...s, p2: null });
    if (s.p1 !== null) return settle({ ...s, p1: null, p2: null });
    return { ...s, exit: true };
  }
  if (s.ready) return s;
  const dev = 'bas' in a ? a.bas : a.onay;
  if (s.p1 === null) return settle({ ...s, p1: dev, p2: s.mode === 'antrenman' ? 'kukla' : null });
  if (s.mode === 'versus' && s.p2 === null) {
    if (dev !== s.p1) return settle({ ...s, p2: dev });
    if ('onay' in a) return settle({ ...s, p2: 'kukla' });
  }
  return s;
}
