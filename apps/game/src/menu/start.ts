import type { Screen, ScreenCtx } from '../screens/manager';
import { BASE_HEIGHT, BASE_WIDTH } from '../viewport/scale';
import { keyToAction, type PadMemory, padStep, readPads } from './input';
import { INITIAL, type MenuAction, type MenuState, menuAt, step } from './menu-state';
import { createMenuView } from './view';

/** Başlık ekranı ve ana menü: durum makinesi, görünüm ve klavye/oyun kolu/fare girdisi. `at` verilirse (bir bölümden
 *  dönüş) başlık atlanır, menü o seçenekte açılır. */
export function createMenuScreen(ctx: ScreenCtx, at?: string): Screen {
  let state: MenuState = at ? menuAt(at) : INITIAL;
  const off = new AbortController();
  const view = createMenuView(ctx.ui, dispatch);
  view.render(state);

  function dispatch(action: MenuAction): void {
    const next = step(state, action);
    if (next === state) return;
    if (state.screen === 'baslik' && next.screen === 'menu') enterFullscreen();
    const launched = next.launch && next.launch.n !== state.launch?.n ? next.launch.id : null;
    state = next;
    view.render(state);
    if (launched === 'versus' || launched === 'antrenman') ctx.go({ name: launched });
  }

  clearCanvas(ctx.canvas);
  void showVersion(view.version);

  window.addEventListener(
    'keydown',
    (e) => {
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
    },
    { signal: off.signal },
  );

  // Dövüşten dönerken basılı kalan tuşlar menüde hemen bir şey seçmesin: ilk okuma yalnız hafızaya alınır.
  let padMem: PadMemory | undefined = at
    ? { prev: readPads(navigator.getGamepads?.() ?? []), next: { up: null, down: null } }
    : undefined;
  let padLoop = 0;
  function pollPads(t: number): void {
    const r = padStep(padMem, readPads(navigator.getGamepads?.() ?? []), t);
    padMem = r.mem;
    for (const a of r.actions) dispatch(a);
    padLoop = requestAnimationFrame(pollPads);
  }
  const startPads = (): void => {
    if (!padLoop) padLoop = requestAnimationFrame(pollPads);
  };
  window.addEventListener('gamepadconnected', startPads, { signal: off.signal });
  if ((navigator.getGamepads?.() ?? []).some((p) => p)) startPads();

  return {
    stage: view.stage,
    stop() {
      off.abort();
      cancelAnimationFrame(padLoop);
      padLoop = 0;
    },
  };
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
