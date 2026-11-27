import { fxToPx } from '@dovus/engine';
import {
  bodyBox,
  cameraX,
  def,
  type Fighter,
  type FightState,
  FLOOR_Y,
  hitbox,
  hurtbox,
  ST,
  STAGE_W,
} from '@dovus/fight';
import { BASE_HEIGHT, BASE_WIDTH } from '../viewport/scale';

/** Dövüş sahnesini 960×540 tuvale tam sayı koordinatlarla çizer: kayan sahne, kutu dövüşçüler, vuruş kıvılcımı;
 *  Antrenman'da vurulabilir (yeşil) ve vuran (kırmızı) kutular. Durumu yalnız okur. */

export interface FightPalette {
  readonly sky: string;
  readonly far: string;
  readonly near: string;
  readonly floor: string;
  readonly floorLine: string;
  readonly shadow: string;
  readonly p1: string;
  readonly p1Dark: string;
  readonly p2: string;
  readonly p2Dark: string;
  readonly hit: string;
  readonly block: string;
  readonly hurtLine: string;
  readonly hitLine: string;
}

/** Renkler tasarım token'larından (CSS değişkenleri); token dışı renk yok. */
export function readFightPalette(): FightPalette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string): string => css.getPropertyValue(`--${name}`).trim() || '#ff00ff';
  return {
    sky: v('sky-900'),
    far: v('sky-700'),
    near: v('navy-700'),
    floor: v('navy-900'),
    floorLine: v('steel-700'),
    shadow: v('ink-950'),
    p1: v('ember-500'),
    p1Dark: v('ember-700'),
    p2: v('volt-500'),
    p2Dark: v('blue-700'),
    hit: v('gold-400'),
    block: v('cyan-400'),
    hurtLine: v('go-500'),
    hitLine: v('stop-500'),
  };
}

const SPARK_FRAMES = 8;

function drawBackground(ctx: CanvasRenderingContext2D, cam: number, pal: FightPalette): void {
  // Gökyüzü pencere kenarındaki boşluktan (ink-950) ayrışsın diye tamamı gece moru.
  ctx.fillStyle = pal.sky;
  ctx.fillRect(0, 0, BASE_WIDTH, FLOOR_Y);
  // Uzak kuleler: kameranın yarı hızında kayar (derinlik hissi).
  ctx.fillStyle = pal.far;
  const far = Math.trunc(cam / 2);
  for (let x = -far % 180; x < BASE_WIDTH; x += 180) ctx.fillRect(x, 250, 70, FLOOR_Y - 250);
  // Yakın sütunlar: sahneyle birlikte kayar; sahnenin iki ucunda duvar.
  ctx.fillStyle = pal.near;
  for (let sx = 120; sx < STAGE_W; sx += 300) ctx.fillRect(sx - cam, 330, 24, FLOOR_Y - 330);
  ctx.fillRect(-cam, 200, 16, FLOOR_Y - 200);
  ctx.fillRect(STAGE_W - 16 - cam, 200, 16, FLOOR_Y - 200);
  // Zemin ve kayan çizgiler.
  ctx.fillStyle = pal.floor;
  ctx.fillRect(0, FLOOR_Y, BASE_WIDTH, BASE_HEIGHT - FLOOR_Y);
  ctx.fillStyle = pal.floorLine;
  ctx.fillRect(0, FLOOR_Y, BASE_WIDTH, 2);
  for (let sx = 0; sx <= STAGE_W; sx += 60) ctx.fillRect(sx - cam, FLOOR_Y + 2, 2, 8);
}

function drawFighter(ctx: CanvasRenderingContext2D, s: FightState, i: 0 | 1, cam: number, pal: FightPalette): void {
  const f: Fighter = s.fighters[i];
  const d = def(s, i);
  const body = bodyBox(f, d);
  const x = fxToPx(body.x) - cam;
  const y = fxToPx(body.y);
  const w = fxToPx(body.w);
  const h = fxToPx(body.h);
  const main = i === 0 ? pal.p1 : pal.p2;
  const dark = i === 0 ? pal.p1Dark : pal.p2Dark;

  // Gölge
  ctx.fillStyle = pal.shadow;
  const footX = fxToPx(f.x) - cam;
  ctx.fillRect(footX - 34, FLOOR_Y + 4, 68, 6);

  // Gövde: sersemken ya da kalkarken soluk; dokunulmazken titrer.
  const flicker = f.invuln > 0 && (s.frame & 2) === 0;
  ctx.globalAlpha = f.state === ST.KO ? 0.55 : flicker ? 0.35 : 1;
  ctx.fillStyle = dark;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = main;
  ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
  // Baş: gövdenin üst kısmı, baktığı yöne kayık.
  if (f.state !== ST.KO && f.state !== ST.KNOCKDOWN) {
    const head = f.facing === 1 ? x + w - 26 : x + 6;
    ctx.fillStyle = dark;
    ctx.fillRect(head, y + 10, 20, 14);
  }
  ctx.globalAlpha = 1;

  // Blokta camgöbeği kalkan çizgisi (öne bakan kenar).
  if (f.state === ST.BLOCK_ST || f.state === ST.BLOCK_CR) {
    ctx.fillStyle = pal.block;
    ctx.fillRect(f.facing === 1 ? x + w : x - 6, y, 6, h);
  }
  // Vuruş: aktif karelerde uzuv olarak çizilir.
  const hit = hitbox(f, d);
  if (hit) {
    ctx.fillStyle = main;
    ctx.fillRect(fxToPx(hit.x) - cam, fxToPx(hit.y), fxToPx(hit.w), fxToPx(hit.h));
    ctx.fillStyle = dark;
    ctx.fillRect(fxToPx(hit.x) - cam, fxToPx(hit.y) + fxToPx(hit.h) - 4, fxToPx(hit.w), 4);
  }
}

function strokeBox(
  ctx: CanvasRenderingContext2D,
  b: { x: number; y: number; w: number; h: number },
  cam: number,
): void {
  const x = fxToPx(b.x) - cam;
  const y = fxToPx(b.y);
  const w = fxToPx(b.w);
  const h = fxToPx(b.h);
  ctx.fillRect(x, y, w, 2);
  ctx.fillRect(x, y + h - 2, w, 2);
  ctx.fillRect(x, y, 2, h);
  ctx.fillRect(x + w - 2, y, 2, h);
}

function drawBoxes(ctx: CanvasRenderingContext2D, s: FightState, cam: number, pal: FightPalette): void {
  for (const i of [0, 1] as const) {
    const f = s.fighters[i];
    const d = def(s, i);
    const hu = hurtbox(f, d);
    if (hu) {
      ctx.fillStyle = pal.hurtLine;
      strokeBox(ctx, hu, cam);
    }
    const hb = hitbox(f, d);
    if (hb) {
      ctx.fillStyle = pal.hitLine;
      strokeBox(ctx, hb, cam);
    }
  }
}

function drawSpark(ctx: CanvasRenderingContext2D, s: FightState, cam: number, pal: FightPalette): void {
  const age = s.frame - s.sparkFrame;
  if (s.sparkKind === 0 || s.sparkFrame < 0 || age < 0 || age >= SPARK_FRAMES + s.hitstop) return;
  const grow = Math.min(age, SPARK_FRAMES);
  const r = 8 + grow * 3;
  const cx = fxToPx(s.sparkX) - cam;
  const cy = fxToPx(s.sparkY);
  ctx.fillStyle = s.sparkKind === 2 ? pal.block : pal.hit;
  ctx.fillRect(cx - r, cy - 2, r * 2, 4);
  ctx.fillRect(cx - 2, cy - r, 4, r * 2);
  const q = Math.trunc(r / 2);
  ctx.fillRect(cx - q, cy - q, q * 2, q * 2);
}

export function drawFight(ctx: CanvasRenderingContext2D, s: FightState, pal: FightPalette, showBoxes: boolean): void {
  ctx.imageSmoothingEnabled = false;
  const cam = cameraX(s);
  drawBackground(ctx, cam, pal);
  // Saldıran (vuruşu aktif olan) önde çizilir.
  const attacking = (f: Fighter): boolean => f.state === ST.ATTACK || f.state === ST.AIR_ATTACK;
  const order: (0 | 1)[] = attacking(s.fighters[0]) ? [1, 0] : [0, 1];
  for (const i of order) drawFighter(ctx, s, i, cam, pal);
  if (showBoxes) drawBoxes(ctx, s, cam, pal);
  drawSpark(ctx, s, cam, pal);
}
