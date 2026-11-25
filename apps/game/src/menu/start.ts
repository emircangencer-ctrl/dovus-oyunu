import { keepFitted } from '../viewport/fit';
import { BASE_HEIGHT, BASE_WIDTH } from '../viewport/scale';
import { keyToAction, type PadMemory, padStep, readPads } from './input';
import { INITIAL, type MenuAction, type MenuState, step } from './menu-state';
import { createMenuView } from './view';

/** Başlık ekranı ve ana menü: durum makinesi, görünüm ve klavye/oyun kolu/fare girdisi. */
export function startMenu(canvas: HTMLCanvasElement, ui: HTMLElement): void {
  let state: MenuState = INITIAL;
  const view = createMenuView(ui, dispatch);
  view.render(state);

  function dispatch(action: MenuAction): void {
    const next = step(state, action);
    if (next === state) return;
    if (state.screen === 'baslik' && next.screen === 'menu') enterFullscreen();
    state = next;
    view.render(state);
  }

  clearCanvas(canvas);
  keepFitted(canvas, ui, view.stage);
  void showVersion(view.version);

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // Tab odağı tarayıcının adres çubuğuna kaçırmasın (WASD ile oynarken Q'nun yanında).
    if (e.key === 'Tab') {
      e.preventDefault();
      return;
    }
    const action = keyToAction(e.key);
    if (!action) return;
    e.preventDefault();
    if (e.repeat && (action === 'sec' || action === 'geri' || action === 'herhangi')) return;
    dispatch(action);
  });

  let padMem: PadMemory | undefined;
  let padLoop = 0;
  function pollPads(t: number): void {
    const r = padStep(padMem, readPads(navigator.getGamepads?.() ?? []), t);
    padMem = r.mem;
    for (const a of r.actions) dispatch(a);
    padLoop = requestAnimationFrame(pollPads);
  }
  window.addEventListener('gamepadconnected', () => {
    if (!padLoop) padLoop = requestAnimationFrame(pollPads);
  });
}

/** Dizüstü ekranlarda pencere içinde oyun 1 katta küçük kalır; tam ekranda 2 kata çıkar. Kullanıcı hareketi içinde çağrılır. */
function enterFullscreen(): void {
  if (document.fullscreenElement || !document.documentElement.requestFullscreen) return;
  document.documentElement
    .requestFullscreen()
    .then(lockEscape)
    .catch(() => {
      // İzin verilmezse (örneğin bir çerçeve içinde) oyun pencerede devam eder.
    });
}

/** Tam ekranda Esc tarayıcıya gitmesin, oyunda "geri" olsun (Chrome/Edge; çıkmak için Esc basılı tutulur). Firefox'ta
 *  bu destek yok: orada ilk Esc tam ekrandan çıkar, geri için Backspace de çalışır. */
function lockEscape(): void {
  const kb = (navigator as Navigator & { keyboard?: { lock?: (codes: string[]) => Promise<void> } }).keyboard;
  kb?.lock?.(['Escape']).catch(() => {});
}

/** Dövüş sahnesi Aşama 1'de bu tuvale çizilecek; şimdilik gece göğü renginde boş. */
function clearCanvas(el: HTMLCanvasElement): void {
  const ctx = el.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#160c2e';
  ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
}

type Health = { version: string; branch: string };

export async function showVersion(el: HTMLElement): Promise<void> {
  try {
    const res = await fetch('/api/health', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const health = (await res.json()) as Health;
    el.textContent = `Sürüm: ${health.version} (${health.branch})`;
  } catch {
    el.textContent = 'Sürüm: bilinmiyor (sunucuya ulaşılamadı)';
  }
}
