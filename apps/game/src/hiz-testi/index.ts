import { hashState, initialState, Rng, type SimState, step } from '@dovus/engine';
import { showVersion } from '../menu/start';
import { keepFitted } from '../viewport/fit';
import { FightInput } from './input';
import { Metrics, ROLLBACK8_LIMIT_MS, STEP_LIMIT_MS, type Summary } from './metrics';
import { readPalette, render } from './render';

const FRAME_MS = 1000 / 60;
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
  update(sum: Summary, target: number, running: boolean): void;
}

function buildPanel(ui: HTMLElement): Panel {
  const stage = el('div', { class: 'sahne hiz-testi', 'data-testid': 'sahne' });
  const panel = el('section', { class: 'ds-panel ds-panel--ribbon hiz-paneli' });
  panel.append(el('span', { class: 'ds-ribbon' }, 'HIZ TESTİ'));
  const rows: Record<string, HTMLElement> = {};
  const table = el('table', { class: 'ds-table hiz-tablo' });
  const body = el('tbody');
  for (const [key, label] of [
    ['sure', 'Süre'],
    ['fps', 'Kare hızı (ekran)'],
    ['sim', 'Simülasyon (adım/sn)'],
    ['dusen', 'Düşen kare'],
    ['adim', `En uzun adım (sınır ${STEP_LIMIT_MS} ms)`],
    ['geri', `En uzun 8 kare geri sarma (sınır ${ROLLBACK8_LIMIT_MS} ms)`],
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
    update(sum, target, running) {
      const set = (k: string, v: string): void => {
        const node = rows[k];
        if (node) node.textContent = v;
      };
      set('sure', `${mmss(Math.min(sum.seconds, target))} / ${mmss(target)}`);
      set('fps', sum.fps.toFixed(1));
      set('sim', sum.simPerSecond.toFixed(1));
      set('dusen', String(sum.dropped));
      set('adim', `${sum.maxStepMs.toFixed(2)} ms`);
      set('geri', `${sum.maxRollback8Ms.toFixed(2)} ms`);
      const text = running ? 'SÜRÜYOR' : sum.seconds === 0 ? 'HAZIR' : sum.verdict;
      verdict.textContent = text;
      verdict.dataset.sonuc = text;
      start.hidden = running;
    },
  };
}

/** Aşama 1a teknik kanıt: iki kutu dövüşçü, 60 Hz sabit adım, ölçüm paneli. Oyuncu 1 klavye/kol, Oyuncu 2 bilgisayar. */
export function startSpeedTest(canvas: HTMLCanvasElement, ui: HTMLElement): void {
  const params = new URLSearchParams(location.search);
  const target = Math.min(3600, Math.max(5, Number(params.get('sure')) || 600));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tuval çizim bağlamı alınamadı');

  const panel = buildPanel(ui);
  keepFitted(canvas, ui, panel.stage);
  void showVersion(panel.version);
  const palette = readPalette();
  const input = new FightInput(window);

  let metrics = new Metrics(target);
  let running = false;
  let state: SimState = initialState(1);
  let cpu = new CpuInput(1);
  let history: Array<{ before: SimState; inputs: [number, number] }> = [];
  let acc = 0;
  let last = 0;
  let mismatch = false;

  const begin = (): void => {
    if (running) return;
    metrics = new Metrics(target);
    state = initialState(1);
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
    if (running) {
      if (last !== 0) {
        const dt = t - last;
        metrics.frame(dt);
        acc += Math.min(dt, 250);
        while (acc >= FRAME_MS) {
          simulate();
          acc -= FRAME_MS;
        }
      }
      last = t;
      const sum = metrics.summary();
      if (sum.verdict !== 'SÜRÜYOR') {
        running = false;
        if (mismatch) throw new Error('Geri sarma sonucu farklı çıktı: determinizm hatası');
      }
      if (state.frame % 15 === 0 || !running) panel.update(sum, target, running);
    }
    render(ctx, state, palette);
    requestAnimationFrame(tick);
  };
  panel.update(metrics.summary(), target, false);
  requestAnimationFrame(tick);
}
