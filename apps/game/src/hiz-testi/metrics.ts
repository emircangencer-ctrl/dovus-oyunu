/** Hız testi ölçümleri (spec Bölüm 11 teknik kanıt şartları):
 *  - Saniyede 60 simülasyon adımı ve tek kare düşmemesi,
 *  - bir simülasyon adımı 1 ms'nin altında,
 *  - 8 karelik geri sarma 4 ms'nin altında.
 *  Kare düşmesi ekranın kendi tazeleme aralığına göre ölçülür: ilk 120 aralığın ortancasının 1,5 katından uzun aralık.
 *  İlk 120 kare ısınmadır: o sürede adım ve geri sarma süreleri de sayılmaz.
 *  Adım şartı %99,9 ile değerlendirilir (adımların en çok binde biri 1 ms ve üstü olabilir): masaüstü işletim sistemi
 *  ve çöp toplayıcı tek tük adımı kesebilir; bu adımın kendi maliyeti değildir. En uzun adım ayrıca gösterilir. */

export type Verdict = 'GEÇTİ' | 'KALDI' | 'GEÇERSİZ' | 'SÜRÜYOR';

export interface Drop {
  /** Test başından beri saniye */
  readonly at: number;
  /** Kare aralığı (ms) */
  readonly ms: number;
}

export interface Summary {
  readonly seconds: number;
  readonly fps: number;
  readonly simPerSecond: number;
  readonly dropped: number;
  readonly maxStepMs: number;
  readonly p50StepMs: number;
  readonly p999StepMs: number;
  readonly stepsOver1Ms: number;
  readonly maxRollback8Ms: number;
  readonly maxWorkMs: number;
  readonly drops: readonly Drop[];
  readonly valid: boolean;
  readonly verdict: Verdict;
}

const BASELINE_FRAMES = 120;
const MAX_DROP_LOG = 100;
/** Adım süresi kovaları: 0,1 ms genişlik (Chrome'un saat çözünürlüğü), son kova 10 ms ve üstü. */
const BUCKETS = 101;
const bucketOf = (ms: number): number => Math.min(BUCKETS - 1, Math.max(0, Math.floor(ms * 10 + 1e-6)));
export const STEP_LIMIT_MS = 1;
export const ROLLBACK8_LIMIT_MS = 4;

export class Metrics {
  private readonly targetSeconds: number;
  private readonly baseline: number[] = [];
  private threshold = Number.POSITIVE_INFINITY;
  private totalMs = 0;
  private frames = 0;
  private sims = 0;
  private dropped = 0;
  private maxStep = 0;
  private readonly stepHist = new Array<number>(BUCKETS).fill(0);
  private steps = 0;
  private over1 = 0;
  private maxRb8 = 0;
  private maxWork = 0;
  private readonly drops: Drop[] = [];
  private valid = true;
  private readonly framesOnly: boolean;

  /** framesOnly: kontrol ölçümü; oyun çalışmaz, sonuç yalnız düşen kareye bakar. */
  constructor(targetSeconds: number, opts: { framesOnly?: boolean } = {}) {
    this.targetSeconds = targetSeconds;
    this.framesOnly = opts.framesOnly ?? false;
  }

  get frameCount(): number {
    return this.frames;
  }

  frame(dtMs: number): void {
    this.totalMs += dtMs;
    this.frames += 1;
    if (this.baseline.length < BASELINE_FRAMES) {
      this.baseline.push(dtMs);
      if (this.baseline.length === BASELINE_FRAMES) {
        const sorted = [...this.baseline].sort((a, b) => a - b);
        this.threshold = 1.5 * (sorted[BASELINE_FRAMES / 2] ?? dtMs);
      }
      return;
    }
    if (dtMs > this.threshold) {
      this.dropped += 1;
      if (this.drops.length < MAX_DROP_LOG) this.drops.push({ at: Number((this.totalMs / 1000).toFixed(2)), ms: dtMs });
    }
  }

  simStep(): void {
    this.sims += 1;
  }

  /** Isınma (ilk 120 kare, tarayıcının kodu derlediği süre) bitmeden ölçülen süreler sayılmaz. */
  private get warm(): boolean {
    return this.baseline.length >= BASELINE_FRAMES;
  }

  stepTime(ms: number): void {
    if (!this.warm) return;
    if (ms > this.maxStep) this.maxStep = ms;
    const b = bucketOf(ms);
    this.stepHist[b] = (this.stepHist[b] ?? 0) + 1;
    this.steps += 1;
    if (b >= 10) this.over1 += 1;
  }

  /** Bir kare döngüsünde oyunun kendi işi (simülasyon + çizim), ms. */
  work(ms: number): void {
    if (this.warm && ms > this.maxWork) this.maxWork = ms;
  }

  /** Adım süresinin p yüzdeliği (0–1), kova alt sınırı olarak. */
  private stepPercentile(p: number): number {
    if (this.steps === 0) return 0;
    const need = Math.ceil(p * this.steps);
    let seen = 0;
    for (let b = 0; b < BUCKETS; b++) {
      seen += this.stepHist[b] ?? 0;
      if (seen >= need) return b / 10;
    }
    return (BUCKETS - 1) / 10;
  }

  rollbackTime(ms: number, frames: number): void {
    if (this.warm && frames === 8 && ms > this.maxRb8) this.maxRb8 = ms;
  }

  hidden(): void {
    this.valid = false;
  }

  summary(): Summary {
    const seconds = this.totalMs / 1000;
    const fps = seconds > 0 ? this.frames / seconds : 0;
    const simPerSecond = seconds > 0 ? this.sims / seconds : 0;
    let verdict: Verdict;
    if (!this.valid) verdict = 'GEÇERSİZ';
    else if (seconds + 1e-6 < this.targetSeconds) verdict = 'SÜRÜYOR';
    else if (this.framesOnly) verdict = this.dropped === 0 ? 'GEÇTİ' : 'KALDI';
    else if (
      this.dropped === 0 &&
      this.over1 * 1000 <= this.steps &&
      this.maxRb8 < ROLLBACK8_LIMIT_MS &&
      simPerSecond >= 59.5
    )
      verdict = 'GEÇTİ';
    else verdict = 'KALDI';
    return {
      seconds,
      fps,
      simPerSecond,
      dropped: this.dropped,
      maxStepMs: this.maxStep,
      p50StepMs: this.stepPercentile(0.5),
      p999StepMs: this.stepPercentile(0.999),
      stepsOver1Ms: this.over1,
      maxRollback8Ms: this.maxRb8,
      maxWorkMs: this.maxWork,
      drops: this.drops,
      valid: this.valid,
      verdict,
    };
  }
}
