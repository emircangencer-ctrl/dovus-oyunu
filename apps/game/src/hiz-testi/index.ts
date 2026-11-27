import { Rng } from '@dovus/engine';
import { hashState, initialState, type SimState, step } from '@dovus/fight';
import { showVersion } from '../menu/start';
import { keepFitted } from '../viewport/fit';
import { FightInput } from './input';
import { startLinkTest } from './link-page';
import { Metrics, ROLLBACK8_LIMIT_MS, STEP_LIMIT_MS, type Summary } from './metrics';
import { readPalette, render } from './render';

const FRAME_MS = 1000 / 60;
/** Ölçüm 10 dakika boyunca gerçek dövüş yükünü görsün: antrenman kuralları (süre ve nakavt yok), girişsiz. */
const SPEED_TEST_OPTIONS = { seed: 1, training: true, intro: false } as const;
const ROLLBACK_FRAMES = 8;

/** Bilgisayar rakip: tohumlu rastgele girdi, 1–10 karede bir değişir. */
class CpuInput {
  private readonly rng: Rng;
  private cur = 0;
  private left = 0;
  constructor(seed: number) {
    this.rng = new Rng(seed);
  }
  next(): number {
    if (this.left === 0) {
      this.cur = this.rng.int(256);
      this.left = 1 + this.rng.int(10);
    }
    this.left -= 1;
    return this.cur;
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

interface Panel {
  readonly stage: HTMLElement;
  readonly version: HTMLElement;
  readonly start: HTMLButtonElement;
  update(sum: Summary, target: number, running: boolean, countdown?: string): void;
}

function buildPanel(ui: HTMLElement, control: boolean): Panel {
  const stage = el('div', { class: 'sahne hiz-testi', 'data-testid': 'sahne' });
  const panel = el('section', { class: 'ds-panel ds-panel--ribbon hiz-paneli' });
  panel.append(el('span', { class: 'ds-ribbon' }, control ? 'KONTROL TESTİ' : 'HIZ TESTİ'));
  const rows: Record<string, HTMLElement> = {};
  const table = el('table', { class: 'ds-table hiz-tablo' });
  const body = el('tbody');
  for (const [key, label] of [
    ['sure', 'Süre'],
    ['fps', 'Kare hızı (ekran)'],
    ['sim', 'Simülasyon (adım/sn)'],
    ['dusen', 'Düşen kare'],
    ['adim', `Adım %99,9 / en uzun (sınır ${STEP_LIMIT_MS} ms)`],
    ['geri', `En uzun 8 kare geri sarma (sınır ${ROLLBACK8_LIMIT_MS} ms)`],
    ['is', 'Kare başına en uzun iş'],
  ] as const) {
    const tr = el('tr');
    const value = el('td', { class: 'num', 'data-testid': `hiz-${key}` }, '—');
    tr.append(el('td', {}, label), value);
    body.append(tr);
    rows[key] = value;
  }
  table.append(body);
  const verdict = el('p', { class: 'hiz-sonuc', 'data-testid': 'hiz-sonuc' }, 'HAZIR');
  const start = el(
    'button',
    { type: 'button', class: 'ds-btn ds-btn--go ds-btn--wide', 'data-testid': 'hiz-baslat' },
    'TESTİ BAŞLAT',
  );
  const note = el(
    'p',
    { class: 'hiz-not' },
    'Test bitene kadar bu sekmede kal; başka sekmeye ya da pencereye geçersen sonuç geçersiz olur.',
  );
  const side = el('div', { class: 'hiz-yan' });
  side.append(verdict, start, note);
  const grid = el('div', { class: 'hiz-izgara' });
  grid.append(table, side);
  panel.append(grid);

  const hints = el('div', { class: 'ds-hints alt-serit' });
  hints.innerHTML =
    '<span class="ipucu"><span class="key">WASD</span>Hareket <span class="key">U</span><span class="key">I</span>Yumruk</span><span class="ipucu"><span class="key">Enter</span>Başlat</span>';
  const version = el('span', { class: 'surum', 'data-testid': 'surum' }, 'Sürüm: yükleniyor…');
  hints.append(el('span', { class: 'sp' }), version);
  stage.append(panel, hints);
  ui.append(stage);

  return {
    stage,
    version,
    start,
    update(sum, target, running, countdown) {
      const set = (k: string, v: string): void => {
        const node = rows[k];
        if (node) node.textContent = v;
      };
      set('sure', `${mmss(Math.min(sum.seconds, target))} / ${mmss(target)}`);
      set('fps', sum.fps.toFixed(1));
      set('sim', control ? '—' : sum.simPerSecond.toFixed(1));
      set('dusen', String(sum.dropped));
      set('adim', control ? '—' : `${sum.p999StepMs.toFixed(2)} / ${sum.maxStepMs.toFixed(2)} ms`);
      set('geri', control ? '—' : `${sum.maxRollback8Ms.toFixed(2)} ms`);
      set('is', `${sum.maxWorkMs.toFixed(2)} ms`);
      const text = running ? 'SÜRÜYOR' : sum.seconds === 0 ? (countdown ?? 'HAZIR') : sum.verdict;
      verdict.textContent = text;
      verdict.dataset.sonuc = text;
      start.hidden = running;
    },
  };
}

/** Aşama 1a teknik kanıt: iki kutu dövüşçü, 60 Hz sabit adım, ölçüm paneli. Oyuncu 1 klavye/kol, Oyuncu 2 bilgisayar.
 *  ?kontrol: aynı kare döngüsü ve ölçüm, ama oyun çalışmaz (tarayıcının ve bilgisayarın kendi kare düşmesi).
 *  ?basla=N: N saniye geri sayımdan sonra kendiliğinden başlar (pencereyi öne almak için zaman). */
export function startSpeedTest(canvas: HTMLCanvasElement, ui: HTMLElement): void {
  const params = new URLSearchParams(location.search);
  const target = Math.min(3600, Math.max(5, Number(params.get('sure')) || 600));
  if (params.has('gecikme')) {
    const delayMs = Math.min(500, Math.max(0, Number(params.get('gecikme')) || 150));
    const cpu = new CpuInput(Math.floor(Math.random() * 2 ** 31) + 1);
    startLinkTest(canvas, ui, { delayMs, seconds: target, input: new FightInput(window), cpu: () => cpu.next() });
    return;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tuval çizim bağlamı alınamadı');

  const control = params.has('kontrol');
  const panel = buildPanel(ui, control);
  keepFitted(canvas, ui, panel.stage);
  void showVersion(panel.version);
  const palette = readPalette();
  const input = new FightInput(window);

  const newMetrics = (): Metrics => new Metrics(target, { framesOnly: control });
  let metrics = newMetrics();
  let running = false;
  let state: SimState = initialState(SPEED_TEST_OPTIONS);
  let cpu = new CpuInput(1);
  let history: Array<{ before: SimState; inputs: [number, number] }> = [];
  let acc = 0;
  let last = 0;
  let mismatch = false;

  const begin = (): void => {
    if (running) return;
    metrics = newMetrics();
    state = initialState(SPEED_TEST_OPTIONS);
    cpu = new CpuInput(1);
    history = [];
    acc = 0;
    last = 0;
    mismatch = false;
    running = true;
    panel.update(metrics.summary(), target, true);
  };
  panel.start.addEventListener('click', begin);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') begin();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && running) metrics.hidden();
  });
  // Teşhis: ölçüm sırasında pencere boyutu değişti mi (tam ekran, bilgi çubuğu)? Panelde değil, inceleme için.
  let resizes = 0;
  window.addEventListener('resize', () => {
    if (running) resizes += 1;
  });
  (window as unknown as { __hiz?: () => unknown }).__hiz = () => ({ ...metrics.summary(), resizes, control });

  const autoStart = params.get('basla');
  if (autoStart !== null) {
    let left = Math.min(600, Math.max(0, Math.floor(Number(autoStart)) || 0));
    const countdown = (): void => {
      if (running) return;
      if (left <= 0) {
        begin();
        return;
      }
      panel.update(metrics.summary(), target, false, `BAŞLIYOR ${mmss(left)}`);
      left -= 1;
      setTimeout(countdown, 1000);
    };
    countdown();
  }

  const simulate = (): void => {
    const inputs: [number, number] = [input.read(), cpu.next()];
    const t0 = performance.now();
    const next = step(state, inputs);
    metrics.stepTime(performance.now() - t0);
    metrics.simStep();
    history.push({ before: state, inputs });
    if (history.length > ROLLBACK_FRAMES) history.shift();
    state = next;
    // Her saniye: son 8 kareyi geri sarıp yeniden oynat ve süresini ölç (rollback'in en kötü durumu).
    if (state.frame % 60 === 0 && history.length === ROLLBACK_FRAMES) {
      const t1 = performance.now();
      let re = (history[0] as { before: SimState }).before;
      for (const h of history) re = step(re, h.inputs);
      metrics.rollbackTime(performance.now() - t1, ROLLBACK_FRAMES);
      if (hashState(re) !== hashState(state)) mismatch = true;
    }
  };

  const tick = (t: number): void => {
    const w0 = performance.now();
    if (running) {
      if (last !== 0) {
        const dt = t - last;
        metrics.frame(dt);
        acc += Math.min(dt, 250);
        while (acc >= FRAME_MS) {
          if (!control) simulate();
          acc -= FRAME_MS;
        }
      }
      last = t;
      const sum = metrics.summary();
      if (sum.verdict !== 'SÜRÜYOR') {
        running = false;
        if (mismatch) throw new Error('Geri sarma sonucu farklı çıktı: determinizm hatası');
      }
      if (metrics.frameCount % 15 === 0 || !running) panel.update(sum, target, running);
    }
    if (!control) render(ctx, state, palette);
    if (running) metrics.work(performance.now() - w0);
    requestAnimationFrame(tick);
  };
  panel.update(metrics.summary(), target, false);
  requestAnimationFrame(tick);
}
