import { cleanInput, DOWN, type Game, HK, HP, hashInts, LEFT, LK, LP, RIGHT, toFx, UP } from '@dovus/engine';
import { ROSTER } from './kukla';
import { FLOOR, MAX_SEPARATION, SCREEN_W, STAGE_LEFT, STAGE_RIGHT, STAGE_W, START_OFFSET } from './stage';
import { type Box, type Fighter, type FighterDef, type FightOptions, type FightState, PHASE, ST } from './types';

/** Dövüş simülasyonu: saf `step(durum, girdiler) → yeni durum`. Yalnız tam sayı, 60 Hz sabit adım, dış saat ya da
 *  rastgelelik yok. Dövüşçüler veriyle tanımlanır (FighterDef); burada yalnız ortak kurallar var. */

export const BUTTONS = LP | LK | HP | HK;
const DIRS = UP | DOWN | LEFT | RIGHT;
/** Göreli girdide ileri ve geri (rakibe doğru = ileri). */
export const FWD = RIGHT;
export const BACK = LEFT;
/** Çift dokunuş (koşma →→, geri sıçrama ←←) için iki basış arası en çok kare. */
export const TAP_WINDOW = 12;
const NO_TAP = -1000;
/** İtme kutusunun dikey kapsamı (ayaktan yukarı, taban pikseli): yerde 0–100, havada 20–90. Havadaki dövüşçü yeterince
 *  yükselince rakibin üstünden geçebilir. */
const PUSH_GROUND_H = toFx(100);
const PUSH_AIR_LOW = toFx(20);
const PUSH_AIR_HIGH = toFx(90);

export const def = (s: FightState, i: 0 | 1): FighterDef => {
  const d = ROSTER[s.chars[i]];
  if (!d) throw new Error(`Kadroda ${s.chars[i]} numaralı dövüşçü yok`);
  return d;
};

function newFighter(d: FighterDef, xPx: number, facing: 1 | -1): Fighter {
  return {
    x: toFx(xPx),
    y: FLOOR,
    vx: 0,
    vy: 0,
    facing,
    hp: d.health,
    state: ST.IDLE,
    stateFrame: 0,
    attack: -1,
    contact: 0,
    stun: 0,
    pushV: 0,
    pushFrames: 0,
    combo: 0,
    comboDamage: 0,
    invuln: 0,
    air: 0,
    fwdTap: NO_TAP,
    backTap: NO_TAP,
    buffered: 0,
    prev: 0,
    knock: 0,
  };
}

/** Raunt başındaki iki dövüşçü (sahnenin ortasında, yüz yüze). */
export function startFighters(chars: readonly [number, number]): [Fighter, Fighter] {
  const d0 = ROSTER[chars[0]];
  const d1 = ROSTER[chars[1]];
  if (!d0 || !d1) throw new Error('Kadroda olmayan dövüşçü');
  const mid = STAGE_W / 2;
  return [newFighter(d0, mid - START_OFFSET, 1), newFighter(d1, mid + START_OFFSET, -1)];
}

export function initialState(opts: FightOptions | number): FightState {
  const o: FightOptions = typeof opts === 'number' ? { seed: opts } : opts;
  const chars = o.chars ?? [0, 0];
  const timerFrames = (o.timerSeconds ?? 99) * 60;
  return {
    frame: 0,
    rng: o.seed >>> 0 || 0x9e3779b9,
    chars,
    fighters: startFighters(chars),
    hitstop: 0,
    sparkX: 0,
    sparkY: 0,
    sparkFrame: -1,
    sparkKind: 0,
    phase: o.intro === false ? PHASE.FIGHT : PHASE.INTRO,
    phaseFrame: 0,
    round: 1,
    timer: timerFrames,
    wins: [0, 0],
    roundResult: 0,
    roundReason: 0,
    winner: -1,
    roundsToWin: o.roundsToWin ?? 2,
    timerFrames,
    training: o.training ? 1 : 0,
  };
}

/** Girdiyi dövüşçünün baktığı yöne göre çevirir: sonuçta RIGHT = ileri, LEFT = geri. */
export function rel(input: number, facing: 1 | -1): number {
  if (facing === 1) return input;
  return (input & ~(LEFT | RIGHT)) | (input & LEFT ? RIGHT : 0) | (input & RIGHT ? LEFT : 0);
}

const isAir = (state: number): boolean => state === ST.AIR || state === ST.AIR_ATTACK || state === ST.HIT_AIR;

function enter(f: Fighter, state: number, patch: Partial<Fighter> = {}): Fighter {
  return { ...f, ...patch, state, stateFrame: f.state === state ? f.stateFrame + 1 : 0 };
}

/** Serbest durumlar (bekleme, yürüme, çömelme, koşma): girdiye göre sıradaki durum. */
function neutral(f: Fighter, d: FighterDef, r: number, relPrev: number, frame: number): Fighter {
  if (r & UP) return enter(f, ST.PREJUMP, { vx: 0 });

  let fwdTap = f.fwdTap;
  let backTap = f.backTap;
  const dir = r & DIRS;
  if (dir === FWD && !(relPrev & FWD)) {
    if (frame - f.fwdTap <= TAP_WINDOW) return enter(f, ST.RUN, { vx: d.run * f.facing, fwdTap: NO_TAP });
    fwdTap = frame;
  }
  if (dir === BACK && !(relPrev & BACK)) {
    if (frame - f.backTap <= TAP_WINDOW) {
      return enter(f, ST.BACKDASH, { vx: -d.backdash.vx * f.facing, backTap: NO_TAP, invuln: d.backdash.invuln });
    }
    backTap = frame;
  }
  const taps = { fwdTap, backTap };
  if (r & DOWN) return enter(f, ST.CROUCH, { ...taps, vx: 0 });
  if (r & FWD) {
    if (f.state === ST.RUN) return enter(f, ST.RUN, { ...taps, vx: d.run * f.facing });
    return enter(f, ST.WALK_F, { ...taps, vx: d.walkF * f.facing });
  }
  if (r & BACK) return enter(f, ST.WALK_B, { ...taps, vx: -d.walkB * f.facing });
  return enter(f, ST.IDLE, { ...taps, vx: 0 });
}

/** Bir dövüşçünün bu karedeki kararı (hareketten önce). */
function control(f: Fighter, d: FighterDef, input: number, frame: number): Fighter {
  const r = rel(input, f.facing);
  const relPrev = rel(f.prev, f.facing);
  const invuln = f.invuln > 0 ? f.invuln - 1 : 0;
  const g: Fighter = { ...f, invuln };
  switch (f.state) {
    case ST.IDLE:
    case ST.WALK_F:
    case ST.WALK_B:
    case ST.CROUCH:
    case ST.RUN:
      return neutral(g, d, r, relPrev, frame);
    case ST.PREJUMP: {
      if (f.stateFrame + 1 < d.jump.prejump) return enter(g, ST.PREJUMP);
      const hop = !(r & UP);
      const vx = r & FWD ? d.jump.vxF * f.facing : r & BACK ? -d.jump.vxB * f.facing : 0;
      return enter(g, ST.AIR, { vx, vy: hop ? d.jump.hopVy : d.jump.vy, air: hop ? 1 : 0 });
    }
    case ST.AIR:
      return enter(g, ST.AIR);
    case ST.LANDING:
      if (f.stun > 1) return enter(g, ST.LANDING, { stun: f.stun - 1 });
      return neutral({ ...g, stun: 0 }, d, r, relPrev, frame);
    case ST.BACKDASH: {
      if (f.stateFrame + 1 >= d.backdash.frames) return neutral(g, d, r, relPrev, frame);
      const speed = Math.max(0, d.backdash.vx - d.backdash.decel * (f.stateFrame + 1));
      return enter(g, ST.BACKDASH, { vx: -speed * f.facing });
    }
    default:
      return enter(g, f.state);
  }
}

/** Hız ve yerçekimi; yere iniş. */
function physics(f: Fighter, d: FighterDef): Fighter {
  if (isAir(f.state)) {
    const y = f.y + f.vy;
    if (y >= FLOOR)
      return {
        ...f,
        x: f.x + f.vx,
        y: FLOOR,
        vx: 0,
        vy: 0,
        state: ST.LANDING,
        stateFrame: 0,
        stun: d.jump.land,
        air: 0,
      };
    return { ...f, x: f.x + f.vx, y, vy: f.vy + d.jump.gravity };
  }
  return { ...f, x: f.x + f.vx };
}

const clampStage = (f: Fighter): Fighter => {
  const lo = toFx(STAGE_LEFT);
  const hi = toFx(STAGE_RIGHT);
  return f.x < lo ? { ...f, x: lo } : f.x > hi ? { ...f, x: hi } : f;
};

/** İtme kutusunun dikey aralığı [üst, alt] (birim). */
function pushSpan(f: Fighter): [number, number] {
  if (isAir(f.state)) return [f.y - PUSH_AIR_HIGH, f.y - PUSH_AIR_LOW];
  return [f.y - PUSH_GROUND_H, f.y];
}

/** Sahne sınırı, itme kutuları ve ekran genişliği sınırı. prevA/prevB bu karenin başındaki konumlar. */
function collide(
  a0: Fighter,
  b0: Fighter,
  da: FighterDef,
  db: FighterDef,
  prevA: Fighter,
  prevB: Fighter,
): [Fighter, Fighter] {
  let a = clampStage(a0);
  let b = clampStage(b0);
  const lo = toFx(STAGE_LEFT);
  const hi = toFx(STAGE_RIGHT);

  // İtme kutuları: soldaki sola, sağdaki sağa; kenara dayanan itilemez, payı öteki alır.
  const [aTop, aBot] = pushSpan(a);
  const [bTop, bBot] = pushSpan(b);
  const aLeft = a.x !== b.x ? a.x < b.x : prevA.x <= prevB.x;
  const reach = toFx(da.pushHalf + db.pushHalf);
  const dx = Math.abs(a.x - b.x);
  if (aTop < bBot && bTop < aBot && dx < reach) {
    const overlap = reach - dx;
    let leftMove = (overlap + 1) >> 1;
    let rightMove = overlap - leftMove;
    const left = aLeft ? a : b;
    const right = aLeft ? b : a;
    if (left.x - leftMove < lo) {
      leftMove = left.x - lo;
      rightMove = overlap - leftMove;
    }
    if (right.x + rightMove > hi) {
      rightMove = hi - right.x;
      leftMove = overlap - rightMove;
    }
    const nl = clampStage({ ...left, x: left.x - leftMove });
    const nr = clampStage({ ...right, x: right.x + rightMove });
    a = aLeft ? nl : nr;
    b = aLeft ? nr : nl;
  }

  // Ekran genişliği: aradaki mesafe sınırı aşarsa uzaklaşan geri çekilir (ikisi de uzaklaşıyorsa paylaşır).
  const sep = Math.abs(a.x - b.x);
  const max = toFx(MAX_SEPARATION);
  if (sep > max) {
    const excess = sep - max;
    const aOut = Math.max(0, aLeft ? prevA.x - a.x : a.x - prevA.x);
    const bOut = Math.max(0, aLeft ? b.x - prevB.x : prevB.x - b.x);
    const total = aOut + bOut;
    const aBack = total === 0 ? excess >> 1 : Math.trunc((excess * aOut) / total);
    const bBack = excess - aBack;
    const dirA = aLeft ? 1 : -1;
    a = { ...a, x: a.x + dirA * aBack };
    b = { ...b, x: b.x - dirA * bBack };
  }
  return [a, b];
}

const TURN_STATES: ReadonlySet<number> = new Set([ST.IDLE, ST.WALK_F, ST.WALK_B, ST.CROUCH, ST.LANDING]);

function face(f: Fighter, other: Fighter): Fighter {
  if (!TURN_STATES.has(f.state) || f.x === other.x) return f;
  const facing: 1 | -1 = other.x > f.x ? 1 : -1;
  return facing === f.facing ? f : { ...f, facing };
}

export function step(s: FightState, inputs: readonly [number, number]): FightState {
  const i0 = cleanInput(inputs[0]);
  const i1 = cleanInput(inputs[1]);
  const d0 = def(s, 0);
  const d1 = def(s, 1);
  const [pa, pb] = s.fighters;

  let a = physics(control(pa, d0, i0, s.frame), d0);
  let b = physics(control(pb, d1, i1, s.frame), d1);
  [a, b] = collide(a, b, d0, d1, pa, pb);
  a = { ...face(a, b), prev: i0 };
  b = { ...face(b, a), prev: i1 };

  return { ...s, frame: s.frame + 1, fighters: [a, b] };
}

/** Kameranın sol kenarı, taban pikseli: iki dövüşçünün ortasını izler, sahneden taşmaz. */
export function cameraX(s: FightState): number {
  const [a, b] = s.fighters;
  const mid = (a.x + b.x) >> 9;
  return Math.min(STAGE_W - SCREEN_W, Math.max(0, mid - SCREEN_W / 2));
}

/** Veri kutusunu (taban pikseli, sağa bakarken) dünya birimine çevirir. */
export function worldBox(f: Fighter, b: Box): Box {
  return {
    x: f.facing === 1 ? f.x + toFx(b.x) : f.x - toFx(b.x + b.w),
    y: f.y + toFx(b.y),
    w: toFx(b.w),
    h: toFx(b.h),
  };
}

const CROUCH_STATES: ReadonlySet<number> = new Set([ST.CROUCH, ST.BLOCK_CR, ST.HIT_CR]);

const LYING_STATES: ReadonlySet<number> = new Set([ST.KNOCKDOWN, ST.KO]);

/** Gövde kutusu (çizim için): duruşa göre ayakta, çömelik, havada ya da yerde yatan. */
export function bodyBox(f: Fighter, d: FighterDef): Box {
  if (LYING_STATES.has(f.state)) return worldBox(f, { x: -80, y: -36, w: 160, h: 36 });
  if (CROUCH_STATES.has(f.state)) return worldBox(f, d.crouchHurt);
  if (isAir(f.state)) return worldBox(f, d.airHurt);
  return worldBox(f, d.standHurt);
}

/** Vurulabilir kutu (dünya birimi); yerde yatarken, kalkarken, havada savrulurken ya da dokunulmazken yok. */
export function hurtbox(f: Fighter, d: FighterDef): Box | null {
  if (f.invuln > 0 || f.state === ST.WAKEUP || f.state === ST.HIT_AIR || LYING_STATES.has(f.state)) return null;
  return bodyBox(f, d);
}

/** Vuruş kutusu yalnız saldırının aktif karelerinde (dünya birimi). */
export function hitbox(f: Fighter, d: FighterDef): Box | null {
  if ((f.state !== ST.ATTACK && f.state !== ST.AIR_ATTACK) || f.attack < 0) return null;
  const atk = d.attacks[f.attack];
  if (!atk) return null;
  const t = f.stateFrame;
  if (t < atk.startup || t >= atk.startup + atk.active) return null;
  return worldBox(f, atk.box);
}

function fighterInts(f: Fighter): number[] {
  return [
    f.x,
    f.y,
    f.vx,
    f.vy,
    f.facing,
    f.hp,
    f.state,
    f.stateFrame,
    f.attack,
    f.contact,
    f.stun,
    f.pushV,
    f.pushFrames,
    f.combo,
    f.comboDamage,
    f.invuln,
    f.air,
    f.fwdTap,
    f.backTap,
    f.buffered,
    f.prev,
    f.knock,
  ];
}

export function hashState(s: FightState): number {
  return hashInts([
    s.frame,
    s.rng,
    s.chars[0],
    s.chars[1],
    ...fighterInts(s.fighters[0]),
    ...fighterInts(s.fighters[1]),
    s.hitstop,
    s.sparkX,
    s.sparkY,
    s.sparkFrame,
    s.sparkKind,
    s.phase,
    s.phaseFrame,
    s.round,
    s.timer,
    s.wins[0],
    s.wins[1],
    s.roundResult,
    s.roundReason,
    s.winner,
    s.roundsToWin,
    s.timerFrames,
    s.training,
  ]);
}

/** Rollback oturumu ve rastgele geri sarma için dövüş oyunu arayüzü. */
export const fightGame: Game<FightState> = {
  init: initialState,
  step,
  hash: hashState,
  frame: (s) => s.frame,
};

/** Eski ad (hız testi sayfaları). */
export type SimState = FightState;
