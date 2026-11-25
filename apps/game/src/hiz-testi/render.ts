import { boxes, FLOOR_Y, fxToPx, type SimState } from '@dovus/engine';
import { BASE_HEIGHT, BASE_WIDTH } from '../viewport/scale';

export interface Palette {
  readonly sky: string;
  readonly ground: string;
  readonly p1: string;
  readonly p2: string;
  readonly hit: string;
  readonly hpTrack: string;
  readonly hpFill: string;
}

/** Tasarım token'larından (CSS değişkenleri) renkleri okur; çizim token dışı renk kullanmaz. */
export function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string): string => css.getPropertyValue(`--${name}`).trim() || '#ff00ff';
  return {
    sky: v('sky-900'),
    ground: v('navy-800'),
    p1: v('ember-500'),
    p2: v('volt-500'),
    hit: v('danger-500'),
    hpTrack: v('hp-track'),
    hpFill: v('hp-fill'),
  };
}

/** 960×540 tabanında tam sayı koordinatlarla kutu dövüşçüleri, vuruş kutularını ve can barlarını çizer. */
export function render(ctx: CanvasRenderingContext2D, s: SimState, pal: Palette): void {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = pal.sky;
  ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
  ctx.fillStyle = pal.ground;
  ctx.fillRect(0, FLOOR_Y, BASE_WIDTH, BASE_HEIGHT - FLOOR_Y);

  s.fighters.forEach((f, i) => {
    const color = i === 0 ? pal.p1 : pal.p2;
    const { hurt, hit } = boxes(f);
    const x = fxToPx(hurt.x);
    const y = fxToPx(hurt.y);
    const w = fxToPx(hurt.w);
    const h = fxToPx(hurt.h);
    ctx.globalAlpha = f.state === 5 ? 0.35 : f.hitstun > 0 ? 0.6 : 0.85;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    // Yüz yönü: göğüs hizasında küçük bir çıkıntı
    ctx.fillRect(f.facing === 1 ? x + w : x - 6, y + 30, 6, 12);
    if (hit) {
      ctx.fillStyle = pal.hit;
      ctx.fillRect(fxToPx(hit.x), fxToPx(hit.y), fxToPx(hit.w), fxToPx(hit.h));
    }
    // Can barı
    const barW = 380;
    const bx = i === 0 ? 40 : BASE_WIDTH - 40 - barW;
    ctx.fillStyle = pal.hpTrack;
    ctx.fillRect(bx, 20, barW, 12);
    ctx.fillStyle = pal.hpFill;
    const fill = Math.floor((barW * f.hp) / 1000);
    ctx.fillRect(i === 0 ? bx : bx + barW - fill, 20, fill, 12);
  });
}
