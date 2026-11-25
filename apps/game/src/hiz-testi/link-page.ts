import { RollbackSession } from '@dovus/engine';
import { showVersion } from '../menu/start';
import { keepFitted } from '../viewport/fit';
import type { FightInput } from './input';
import { DelayedLink, type LinkChannel, LinkPeer } from './link';
import { readPalette, render } from './render';

const FRAME_MS = 1000 / 60;
const INPUT_DELAY = 2;
const PEER_TIMEOUT_MS = 2500;

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

type Status = 'bekliyor' | 'bagli' | 'kapandi' | 'bitti' | 'desteklenmiyor';

/** İki sekme gecikme testi (spec Bölüm 11): aynı tarayıcının iki penceresi BroadcastChannel ile konuşur; her mesaj
 *  yapay olarak gecikme ± 20 ms bekletilir. Her iki taraf rollback ile oynar ve 60 karede bir durum özetlerini karşılaştırır. */
export function startLinkTest(
  canvas: HTMLCanvasElement,
  ui: HTMLElement,
  opts: { delayMs: number; seconds: number; input: FightInput; cpu: () => number },
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tuval çizim bağlamı alınamadı');

  const stage = el('div', { class: 'sahne hiz-testi', 'data-testid': 'sahne' });
  const panel = el('section', { class: 'ds-panel ds-panel--ribbon hiz-paneli' });
  panel.append(el('span', { class: 'ds-ribbon' }, 'GECİKME TESTİ'));
  const table = el('table', { class: 'ds-table hiz-tablo' });
  const body = el('tbody');
  const cells: Record<string, HTMLElement> = {};
  for (const [key, label] of [
    ['rol', 'Bu pencere'],
    ['gecikme', 'Yapay gecikme'],
    ['kare', 'Kesinleşen kare'],
    ['geri', 'En derin geri sarma'],
    ['bekleme', 'Rakibi bekleme (kare)'],
  ] as const) {
    const tr = el('tr');
    const td = el('td', { class: 'num', 'data-testid': `link-${key}` }, '—');
    tr.append(el('td', {}, label), td);
    body.append(tr);
    cells[key] = td;
  }
  table.append(body);
  const status = el('p', { class: 'hiz-sonuc', 'data-testid': 'hiz-senkron' }, 'İKİNCİ PENCERE BEKLENİYOR');
  const note = el(
    'p',
    { class: 'hiz-not' },
    'Bu adresi ikinci bir pencerede de aç ve iki pencereyi ekranda yan yana koy. İkisi de görünür olmalı.',
  );
  const side = el('div', { class: 'hiz-yan' });
  side.append(status, note);
  const grid = el('div', { class: 'hiz-izgara' });
  grid.append(table, side);
  panel.append(grid);
  const hints = el('div', { class: 'ds-hints alt-serit' });
  const version = el('span', { class: 'surum', 'data-testid': 'surum' }, 'Sürüm: yükleniyor…');
  hints.append(
    el('span', { class: 'ipucu' }, `Gecikme ${opts.delayMs} ms ± 20 ms · girdi gecikmesi ${INPUT_DELAY} kare`),
    el('span', { class: 'sp' }),
    version,
  );
  stage.append(panel, hints);
  ui.append(stage);
  keepFitted(canvas, ui, stage);
  void showVersion(version);
  const palette = readPalette();
  const set = (k: string, v: string): void => {
    const node = cells[k];
    if (node) node.textContent = v;
  };
  set('gecikme', `${opts.delayMs} ms`);

  if (typeof BroadcastChannel === 'undefined') {
    status.textContent = 'BU TARAYICI DESTEKLEMİYOR';
    return;
  }
  const bc = new BroadcastChannel('sysko-hiz-testi');
  const adapter: LinkChannel = { postMessage: (m) => bc.postMessage(m), onmessage: null };
  const myId = Math.floor(Math.random() * 2 ** 31);
  let peerId: number | null = null;
  let peer: LinkPeer | null = null;
  let state: Status = 'bekliyor';
  let lastHeard = 0;
  let mismatch: number | null = null;

  bc.onmessage = (e: MessageEvent) => {
    const m = e.data as { t?: string; id?: number };
    lastHeard = performance.now();
    if (m.t === 'merhaba' && typeof m.id === 'number' && m.id !== myId) {
      if (peerId === null) {
        peerId = m.id;
        const role: 0 | 1 = myId < peerId ? 0 : 1;
        const session = new RollbackSession({ seed: 7, local: role, maxRollback: 8, delay: INPUT_DELAY });
        const link = new DelayedLink(adapter, opts.delayMs, Math.random);
        peer = new LinkPeer(session, link, () => {
          const k = opts.input.read();
          return k !== 0 ? k : opts.cpu();
        });
        peer.onMismatch = (f) => {
          mismatch ??= f;
        };
        state = 'bagli';
        set('rol', role === 0 ? 'Oyuncu 1' : 'Oyuncu 2');
      }
      bc.postMessage({ t: 'merhaba', id: myId });
      return;
    }
    adapter.onmessage?.({ data: e.data });
  };
  const hello = setInterval(() => {
    if (state === 'bekliyor') bc.postMessage({ t: 'merhaba', id: myId });
  }, 300);
  bc.postMessage({ t: 'merhaba', id: myId });

  let acc = 0;
  let last = 0;
  let elapsed = 0;
  const tick = (t: number): void => {
    const dt = last === 0 ? 0 : t - last;
    last = t;
    if (state === 'bagli' && peer) {
      elapsed += dt;
      acc += Math.min(dt, 250);
      while (acc >= FRAME_MS) {
        peer.tick();
        acc -= FRAME_MS;
      }
      if (performance.now() - lastHeard > PEER_TIMEOUT_MS) state = 'kapandi';
      if (elapsed / 1000 >= opts.seconds) {
        state = 'bitti';
        clearInterval(hello);
      }
      set('kare', String(peer.session.confirmedFrame));
      set('geri', `${peer.maxRollback} kare`);
      set('bekleme', String(peer.stalls));
    }
    if (peer) render(ctx, peer.session.state, palette);
    status.textContent =
      mismatch !== null
        ? `SENKRON: FARKLI (kare ${mismatch})`
        : state === 'bekliyor'
          ? 'İKİNCİ PENCERE BEKLENİYOR'
          : state === 'kapandi'
            ? 'İKİNCİ PENCERE KAPANDI'
            : `SENKRON: AYNI (${peer?.compared ?? 0} karşılaştırma)`;
    status.dataset.sonuc = mismatch !== null || state === 'kapandi' ? 'KALDI' : state === 'bitti' ? 'GEÇTİ' : '';
    if (state !== 'bitti' && state !== 'kapandi') requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
