import './ui/kit.css';
import './style.css';
import { keyToAction, type PadMemory, padStep, readPads } from './menu/input';
import { INITIAL, type MenuAction, type MenuState, step } from './menu/menu-state';
import { createMenuView } from './menu/view';
import { BASE_HEIGHT, BASE_WIDTH, computeScale } from './viewport/scale';

const UI_WIDTH = 1920;

const canvas = document.querySelector<HTMLCanvasElement>('#oyun');
const ui = document.querySelector<HTMLElement>('#arayuz');
if (!canvas || !ui) throw new Error('Sayfa iskeleti eksik: #oyun veya #arayuz bulunamadı');

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

/** Dizüstü ekranlarda pencere içinde oyun 1 katta küçük kalır; tam ekranda 2 kata çıkar. Kullanıcı hareketi içinde çağrılır. */
function enterFullscreen(): void {
  if (document.fullscreenElement || !document.documentElement.requestFullscreen) return;
  document.documentElement.requestFullscreen().catch(() => {
    // İzin verilmezse (örneğin bir çerçeve içinde) oyun pencerede devam eder.
  });
}

clearCanvas(canvas);
fitToWindow();
window.addEventListener('resize', fitToWindow);
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

/** Tuval ve arayüz aynı tam sayı katla ölçeklenir; ölçek cihaz pikseliyle hesaplanır (Windows %125/%150 için). */
function fitToWindow(): void {
  if (!canvas || !ui) return;
  const dpr = window.devicePixelRatio || 1;
  const fit = computeScale(Math.floor(window.innerWidth * dpr), Math.floor(window.innerHeight * dpr));
  for (const node of [canvas, ui]) {
    node.style.width = `${fit.width / dpr}px`;
    node.style.height = `${fit.height / dpr}px`;
    node.style.left = `${fit.offsetX / dpr}px`;
    node.style.top = `${fit.offsetY / dpr}px`;
  }
  view.stage.style.transform = `scale(${fit.width / dpr / UI_WIDTH})`;
}

/** Dövüş sahnesi Aşama 1'de bu tuvale çizilecek; şimdilik gece göğü renginde boş. */
function clearCanvas(el: HTMLCanvasElement): void {
  const ctx = el.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#160c2e';
  ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
}

type Health = { version: string; branch: string };

async function showVersion(el: HTMLElement): Promise<void> {
  try {
    const res = await fetch('/api/health', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const health = (await res.json()) as Health;
    el.textContent = `Sürüm: ${health.version} (${health.branch})`;
  } catch {
    el.textContent = 'Sürüm: bilinmiyor (sunucuya ulaşılamadı)';
  }
}
