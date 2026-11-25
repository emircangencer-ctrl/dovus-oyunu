/** Hız testi ölçümleri (spec Bölüm 11 teknik kanıt şartları):
 *  - Saniyede 60 simülasyon adımı ve tek kare düşmemesi,
 *  - bir simülasyon adımı 1 ms'nin altında,
 *  - 8 karelik geri sarma 4 ms'nin altında.
 *  Kare düşmesi ekranın kendi tazeleme aralığına göre ölçülür: ilk 120 aralığın ortancasının 1,5 katından uzun aralık.
 *  İlk 120 kare ısınmadır: o sürede adım ve geri sarma süreleri de sayılmaz. */

export type Verdict = 'GEÇTİ' | 'KALDI' | 'GEÇERSİZ' | 'SÜRÜYOR';

export interface Summary {
  readonly seconds: number;
  readonly fps: number;
  readonly simPerSecond: number;
  readonly dropped: number;
  readonly maxStepMs: number;
  readonly maxRollback8Ms: number;
  readonly valid: boolean;
  readonly verdict: Verdict;
}

const BASELINE_FRAMES = 120;
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
  private maxRb8 = 0;
  private valid = true;

  constructor(targetSeconds: number) {
    this.targetSeconds = targetSeconds;
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
    if (dtMs > this.threshold) this.dropped += 1;
  }

  simStep(): void {
    this.sims += 1;
  }

  /** Isınma (ilk 120 kare, tarayıcının kodu derlediği süre) bitmeden ölçülen süreler sayılmaz. */
  private get warm(): boolean {
    return this.baseline.length >= BASELINE_FRAMES;
  }

  stepTime(ms: number): void {
    if (this.warm && ms > this.maxStep) this.maxStep = ms;
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
    else if (
      this.dropped === 0 &&
      this.maxStep < STEP_LIMIT_MS &&
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
      maxRollback8Ms: this.maxRb8,
      valid: this.valid,
      verdict,
    };
  }
}
