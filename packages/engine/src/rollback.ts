import { randomInputs } from './random-inputs';
import { Rng } from './rng';
import { hashState, initialState, type SimState, step } from './sim';

export interface RollbackOptions {
  readonly seed: number;
  /** Bu tarafın oyuncusu: 0 = Oyuncu 1, 1 = Oyuncu 2. */
  readonly local: 0 | 1;
  readonly maxRollback: number;
  /** Yerel girdi gecikmesi (kare); girdiyi hangi kareye yazacağına çağıran karar verir. */
  readonly delay: number;
}

const HASH_KEEP = 1200;

/** Rollback oturumu: rakibin girdisi gelmeden onu tahmin ederek (son bilinen girdi) ilerler; gerçek girdi farklı
 *  gelirse en fazla maxRollback kare geri sarıp yeniden oynatır. Simülasyon saf olduğu için durumlar paylaşılır. */
export class RollbackSession {
  readonly opts: RollbackOptions;
  state: SimState;
  confirmedFrame = -1;
  lastRollbackFrames = 0;

  private readonly localInputs = new Map<number, number>();
  private readonly remoteInputs = new Map<number, number>();
  /** Her karede rakip için kullanılan (gerçek ya da tahmin) girdi. */
  private readonly usedRemote = new Map<number, number>();
  /** Karenin başındaki durum: states.get(f) = f karesi adımlanmadan önceki durum. */
  private readonly states = new Map<number, SimState>();
  private readonly hashes = new Map<number, number>();
  private remoteKnownThrough = -1;
  private rollbackFrom = Number.POSITIVE_INFINITY;

  constructor(opts: RollbackOptions) {
    this.opts = opts;
    this.state = initialState(opts.seed);
    this.states.set(0, this.state);
  }

  addLocal(frame: number, input: number): void {
    this.localInputs.set(frame, input);
  }

  addRemote(frame: number, input: number): void {
    if (this.remoteInputs.has(frame)) return;
    this.remoteInputs.set(frame, input);
    while (this.remoteInputs.has(this.remoteKnownThrough + 1)) this.remoteKnownThrough += 1;
    const used = this.usedRemote.get(frame);
    if (frame < this.state.frame && used !== input) this.rollbackFrom = Math.min(this.rollbackFrom, frame);
  }

  /** Bir kare daha tahminle ilerlemek geri sarma sınırını aşar mı? */
  canAdvance(): boolean {
    return this.state.frame - (this.remoteKnownThrough + 1) < this.opts.maxRollback;
  }

  /** Bekleyen düzeltmeyi uygular (gerekirse geri sarar), sonra bir kare ilerler. */
  advance(): void {
    if (!this.canAdvance()) {
      throw new RangeError(`Rakip girdisi ${this.opts.maxRollback} kareden fazla gecikti; ilerlenemez.`);
    }
    this.sync();
    this.stepFrame(this.state.frame);
    this.confirm();
  }

  /** Gelen gerçek girdiler tahminden farklıysa geri sarıp yeniden oynatır; kare ilerletmez. */
  sync(): void {
    this.lastRollbackFrames = 0;
    if (this.rollbackFrom !== Number.POSITIVE_INFINITY) {
      const from = this.rollbackFrom;
      const to = this.state.frame;
      const depth = to - from;
      if (depth > this.opts.maxRollback)
        throw new RangeError(`Geri sarma ${depth} kare; sınır ${this.opts.maxRollback}.`);
      const saved = this.states.get(from);
      if (!saved) throw new Error(`Kare ${from} için kayıtlı durum yok.`);
      this.state = saved;
      for (let f = from; f < to; f++) this.stepFrame(f);
      this.lastRollbackFrames = depth;
      this.rollbackFrom = Number.POSITIVE_INFINITY;
    }
    this.confirm();
  }

  confirmedHash(frame: number): number | undefined {
    return this.hashes.get(frame);
  }

  private predictRemote(frame: number): number {
    const actual = this.remoteInputs.get(frame);
    if (actual !== undefined) return actual;
    // Tahmin: bu kareden önce bilinen son gerçek girdi.
    const last = Math.min(this.remoteKnownThrough, frame - 1);
    return last >= 0 ? (this.remoteInputs.get(last) ?? 0) : 0;
  }

  private stepFrame(frame: number): void {
    const local = this.localInputs.get(frame) ?? this.localInputs.get(frame - 1) ?? 0;
    const remote = this.predictRemote(frame);
    this.usedRemote.set(frame, remote);
    const inputs: [number, number] = this.opts.local === 0 ? [local, remote] : [remote, local];
    this.state = step(this.state, inputs);
    this.states.set(this.state.frame, this.state);
    this.states.delete(this.state.frame - this.opts.maxRollback - 2);
  }

  private confirm(): void {
    const through = Math.min(this.remoteKnownThrough, this.state.frame - 1);
    for (let f = this.confirmedFrame + 1; f <= through; f++) {
      if (!this.localInputs.has(f)) break;
      const after = this.states.get(f + 1);
      if (!after) break;
      this.hashes.set(f, hashState(after));
      this.hashes.delete(f - HASH_KEEP);
      this.confirmedFrame = f;
    }
  }
}

/** "Rastgele geri sarma" modu (spec Bölüm 11): aynı girdilerle oyun hem düz hem de her karede rastgele 1–8 kare geri
 *  sarılıp yeniden oynatılarak çalıştırılır; iki sonuç özeti döner ve birebir aynı olmalıdır. */
export function randomRewindRun(seed: number, frames: number): { plain: number; rewound: number } {
  const ins = randomInputs(seed, frames);
  let plain = initialState(seed);
  for (const i of ins) plain = step(plain, i);

  const r = new Rng(seed ^ 0x5bd1e995);
  const saved: SimState[] = [initialState(seed)];
  let cur = saved[0] as SimState;
  for (let f = 0; f < frames; f++) {
    cur = step(cur, ins[f] as [number, number]);
    saved[f + 1] = cur;
    if (r.int(3) === 0) {
      const back = Math.min(1 + r.int(8), f + 1);
      let re = saved[f + 1 - back] as SimState;
      for (let g = f + 1 - back; g <= f; g++) {
        re = step(re, ins[g] as [number, number]);
        saved[g + 1] = re;
      }
      cur = re;
    }
  }
  return { plain: hashState(plain), rewound: hashState(cur) };
}
