import { cleanInput, DOWN, type Game, hashInts, toFx, UP } from '@dovus/engine';
import {
  AIR_RESET_LAND,
  airAttack,
  attackFrame,
  groundAttack,
  KNOCKDOWN_FRAMES,
  resolveContacts,
  WAKEUP_FRAMES,
} from './combat';
import { BACK, BUTTONS, COMBO_STATES, DIRS, def, enter, FWD, isAir, NO_TAP, rel, TAP_WINDOW } from './common';
import { ROSTER } from './kukla';
import { roundFlow } from './round';
import { FLOOR, MAX_SEPARATION, SCREEN_W, STAGE_LEFT, STAGE_RIGHT, STAGE_W, START_OFFSET } from './stage';
import { type Fighter, type FighterDef, type FightOptions, type FightState, PHASE, ST } from './types';

/** Dövüş simülasyonu: saf `step(durum, girdiler) → yeni durum`. Yalnız tam sayı, 60 Hz sabit adım, dış saat ya da
 *  rastgelelik yok. Dövüşçüler veriyle tanımlanır (FighterDef); burada yalnız ortak kurallar var. */

export { bodyBox, hitbox, hurtbox, worldBox } from './boxes';
export { BACK, BUTTONS, def, FWD, rel, TAP_WINDOW } from './common';

/** İtme kutusunun dikey kapsamı (ayaktan yukarı, taban pikseli): yerde 0–100, havada 20–90. Havadaki dövüşçü yeterince
 *  yükselince rakibin üstünden geçebilir. */
const PUSH_GROUND_H = toFx(100);
const PUSH_AIR_LOW = toFx(20);
const PUSH_AIR_HIGH = toFx(90);

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

/** Serbest durumlar (bekleme, yürüme, çömelme, koşma): girdiye göre sıradaki durum. */
function neutral(f: Fighter, d: FighterDef, r: number, relPrev: number, pressed: number, frame: number): Fighter {
  const atk = groundAttack(f, d, r, pressed);
  if (atk) return atk;
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
  const pressed = (input & ~f.prev & BUTTONS) | f.buffered;
  const combo = COMBO_STATES.has(f.state) ? {} : { combo: 0, comboDamage: 0 };
  const g: Fighter = { ...f, ...combo, invuln: f.invuln > 0 ? f.invuln - 1 : 0, buffered: 0 };
  const free = (h: Fighter): Fighter =>
    neutral({ ...h, attack: -1, contact: 0, stun: 0 }, d, r, relPrev, pressed, frame);
  switch (f.state) {
    case ST.IDLE:
    case ST.WALK_F:
    case ST.WALK_B:
    case ST.CROUCH:
    case ST.RUN:
      return neutral(g, d, r, relPrev, pressed, frame);
    case ST.PREJUMP: {
      if (f.stateFrame + 1 < d.jump.prejump) return enter(g, ST.PREJUMP);
      const hop = !(r & UP);
      const vx = r & FWD ? d.jump.vxF * f.facing : r & BACK ? -d.jump.vxB * f.facing : 0;
      return enter(g, ST.AIR, { vx, vy: hop ? d.jump.hopVy : d.jump.vy, air: hop ? 1 : 0 });
    }
    case ST.AIR:
      return airAttack(g, d, pressed) ?? enter(g, ST.AIR);
    case ST.AIR_ATTACK:
      return enter(g, ST.AIR_ATTACK);
    case ST.ATTACK:
      return attackFrame(g, d, r, pressed) ?? free(g);
    case ST.LANDING:
    case ST.HIT_ST:
    case ST.HIT_CR:
    case ST.BLOCK_ST:
    case ST.BLOCK_CR:
    case ST.WAKEUP:
      if (f.stun > 1) return enter(g, f.state, { stun: f.stun - 1 });
      return free(g);
    case ST.KNOCKDOWN:
      if (f.stun > 1) return enter(g, ST.KNOCKDOWN, { stun: f.stun - 1 });
      return enter(g, ST.WAKEUP, { stun: WAKEUP_FRAMES });
    case ST.BACKDASH: {
      if (f.stateFrame + 1 >= d.backdash.frames) return free(g);
      const speed = Math.max(0, d.backdash.vx - d.backdash.decel * (f.stateFrame + 1));
      return enter(g, ST.BACKDASH, { vx: -speed * f.facing });
    }
    default:
      return enter(g, f.state);
  }
}

/** Hız, geri itilme ve yerçekimi; yere iniş. */
function physics(f: Fighter, d: FighterDef): Fighter {
  if (isAir(f.state)) {
    const y = f.y + f.vy;
    if (y < FLOOR) return { ...f, x: f.x + f.vx, y, vy: f.vy + d.jump.gravity };
    const landed = { ...f, x: f.x + f.vx, y: FLOOR, vx: 0, vy: 0, stateFrame: 0, air: 0, attack: -1, contact: 0 };
    if (f.state === ST.HIT_AIR) {
      if (f.hp === 0) return { ...landed, state: ST.KO, stun: 0, knock: 0 };
      if (f.knock) return { ...landed, state: ST.KNOCKDOWN, stun: KNOCKDOWN_FRAMES, knock: 0 };
      return { ...landed, state: ST.LANDING, stun: d.jump.land + AIR_RESET_LAND };
    }
    return { ...landed, state: ST.LANDING, stun: d.jump.land };
  }
  if (f.pushFrames > 0) {
    const left = f.pushFrames - 1;
    return { ...f, x: f.x + f.vx + f.pushV, pushFrames: left, pushV: left > 0 ? f.pushV : 0 };
  }
  return { ...f, x: f.x + f.vx };
}

/** Sahne kenarını aşan kısım (işaretli, birim). */
function overshoot(f: Fighter): number {
  const lo = toFx(STAGE_LEFT);
  const hi = toFx(STAGE_RIGHT);
  return f.x < lo ? f.x - lo : f.x > hi ? f.x - hi : 0;
}

const clampStage = (f: Fighter): Fighter => {
  const o = overshoot(f);
  return o === 0 ? f : { ...f, x: f.x - o };
};

/** İtme kutusunun dikey aralığı [üst, alt] (birim). */
function pushSpan(f: Fighter): [number, number] {
  if (isAir(f.state)) return [f.y - PUSH_AIR_HIGH, f.y - PUSH_AIR_LOW];
  return [f.y - PUSH_GROUND_H, f.y];
}

/** Köşede: geri itilen kenara dayanırsa, itmenin kenarı aşan kısmı rakibi ters yöne iter. */
function cornerShare(now: Fighter, before: Fighter): number {
  if (before.pushFrames === 0) return 0;
  const o = overshoot(now);
  return o !== 0 && Math.sign(o) === Math.sign(before.pushV) ? o : 0;
}

/** Sahne sınırı, köşede itme aktarımı, itme kutuları ve ekran genişliği sınırı. prevA/prevB karenin başındaki hâl. */
function collide(
  a0: Fighter,
  b0: Fighter,
  da: FighterDef,
  db: FighterDef,
  prevA: Fighter,
  prevB: Fighter,
): [Fighter, Fighter] {
  const shareA = cornerShare(a0, prevA);
  const shareB = cornerShare(b0, prevB);
  let a = clampStage({ ...a0, x: a0.x - shareB });
  let b = clampStage({ ...b0, x: b0.x - shareA });
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

/** Vuruş donması: hiçbir şey hareket etmez; basılan tuşlar sonraki ilk serbest kare için saklanır. */
function freeze(f: Fighter, input: number): Fighter {
  return { ...f, buffered: f.buffered | (input & ~f.prev & BUTTONS), prev: input };
}

/** Yeni raunt: dövüşçüler başa, süre dolu; galibiyetler ve raunt numarası korunur. */
function nextRound(s: FightState): FightState {
  return {
    ...s,
    fighters: startFighters(s.chars),
    hitstop: 0,
    sparkFrame: -1,
    sparkKind: 0,
    phase: PHASE.INTRO,
    phaseFrame: 0,
    round: s.round + 1,
    timer: s.timerFrames,
    roundResult: 0,
    roundReason: 0,
  };
}

export function step(s: FightState, inputs: readonly [number, number]): FightState {
  // Girdi yalnız dövüş evresinde işlenir (girişte, raunt ve maç sonunda dövüşçüler kendi kendine kalır).
  const live = s.phase === PHASE.FIGHT;
  const i0 = live ? cleanInput(inputs[0]) : 0;
  const i1 = live ? cleanInput(inputs[1]) : 0;
  const [pa, pb] = s.fighters;
  const d0 = def(s, 0);
  const d1 = def(s, 1);
  if (s.hitstop > 0) {
    const frozen = {
      ...s,
      frame: s.frame + 1,
      hitstop: s.hitstop - 1,
      fighters: [freeze(pa, i0), freeze(pb, i1)] as const,
    };
    return roundFlow(frozen, true, [d0, d1], nextRound);
  }

  let a = physics(control(pa, d0, i0, s.frame), d0);
  let b = physics(control(pb, d1, i1, s.frame), d1);
  [a, b] = collide(a, b, d0, d1, pa, pb);
  a = face(a, b);
  b = face(b, a);
  const hit = resolveContacts(a, b, d0, d1, [i0, i1]);
  [a, b] = hit.fighters;
  const spark = hit.spark
    ? { sparkX: hit.spark.x, sparkY: hit.spark.y, sparkFrame: s.frame + 1, sparkKind: hit.spark.kind }
    : {};

  const next: FightState = {
    ...s,
    ...spark,
    frame: s.frame + 1,
    hitstop: hit.hitstop,
    fighters: [
      { ...a, prev: i0 },
      { ...b, prev: i1 },
    ],
  };
  return roundFlow(next, false, [d0, d1], nextRound);
}

/** Kameranın sol kenarı, taban pikseli: iki dövüşçünün ortasını izler, sahneden taşmaz. */
export function cameraX(s: FightState): number {
  const [a, b] = s.fighters;
  const mid = (a.x + b.x) >> 9;
  return Math.min(STAGE_W - SCREEN_W, Math.max(0, mid - SCREEN_W / 2));
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
