import { DOWN, HK, HP, LEFT, LK, LP, RIGHT, UP } from '@dovus/engine';

/** Dövüş girdisi: klavye (oklar/WASD + U I J K) ve oyun kolu (standart eşleme; PlayStation: □ hafif yumruk,
 *  △ ağır yumruk, × hafif tekme, ○ ağır tekme). Tuşlar fiziksel konumla (e.code) okunur; Türkçe-F klavyede de doğru yerdedir. */
const KEYS: Record<string, number> = {
  ArrowUp: UP,
  KeyW: UP,
  ArrowDown: DOWN,
  KeyS: DOWN,
  ArrowLeft: LEFT,
  KeyA: LEFT,
  ArrowRight: RIGHT,
  KeyD: RIGHT,
  KeyU: LP,
  KeyI: HP,
  KeyJ: LK,
  KeyK: HK,
};

export class FightInput {
  private keys = 0;

  constructor(target: Window) {
    target.addEventListener('keydown', (e) => {
      const bit = KEYS[e.code];
      if (bit === undefined) return;
      e.preventDefault();
      this.keys |= bit;
    });
    target.addEventListener('keyup', (e) => {
      const bit = KEYS[e.code];
      if (bit !== undefined) this.keys &= ~bit;
    });
    target.addEventListener('blur', () => {
      this.keys = 0;
    });
  }

  read(): number {
    let v = this.keys;
    for (const gp of navigator.getGamepads?.() ?? []) {
      if (!gp?.connected) continue;
      const on = (i: number): boolean => gp.buttons[i]?.pressed ?? false;
      const ax = gp.axes[0] ?? 0;
      const ay = gp.axes[1] ?? 0;
      if (on(12) || ay < -0.5) v |= UP;
      if (on(13) || ay > 0.5) v |= DOWN;
      if (on(14) || ax < -0.5) v |= LEFT;
      if (on(15) || ax > 0.5) v |= RIGHT;
      if (on(2)) v |= LP;
      if (on(3)) v |= HP;
      if (on(0)) v |= LK;
      if (on(1)) v |= HK;
    }
    return v;
  }
}
