import { BASE_HEIGHT, BASE_WIDTH, computeScale } from './viewport/scale';

const canvas = document.querySelector<HTMLCanvasElement>('#oyun');
const surum = document.querySelector<HTMLElement>('[data-testid="surum"]');
if (!canvas || !surum) throw new Error('Sayfa iskeleti eksik: #oyun veya sürüm satırı bulunamadı');

drawTestPattern(canvas);
fitToWindow(canvas);
window.addEventListener('resize', () => fitToWindow(canvas));
void showVersion(surum);

/** Ölçek cihaz pikseliyle hesaplanır; böylece Windows'taki %125/%150 ekran ölçeğinde de pikseller eşit kalır. */
function fitToWindow(el: HTMLCanvasElement): void {
  const dpr = window.devicePixelRatio || 1;
  const fit = computeScale(Math.floor(window.innerWidth * dpr), Math.floor(window.innerHeight * dpr));
  el.style.width = `${fit.width / dpr}px`;
  el.style.height = `${fit.height / dpr}px`;
  el.style.left = `${fit.offsetX / dpr}px`;
  el.style.top = `${fit.offsetY / dpr}px`;
}

/** Aşama 0 deseni: ızgara ve 1 piksellik dama alanları; bulanık ölçeklemeyi gözle hemen belli eder. */
function drawTestPattern(el: HTMLCanvasElement): void {
  const ctx = el.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#14121c';
  ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

  ctx.fillStyle = '#221f2e';
  for (let x = 0; x < BASE_WIDTH; x += 32) ctx.fillRect(x, 0, 1, BASE_HEIGHT);
  for (let y = 0; y < BASE_HEIGHT; y += 32) ctx.fillRect(0, y, BASE_WIDTH, 1);

  const colors = ['#f26b3a', '#4d86f7', '#f3eee5'];
  colors.forEach((color, i) => {
    const left = 336 + i * 96;
    ctx.fillStyle = color;
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        if ((x + y) % 2 === 0) ctx.fillRect(left + x, 238 + y, 1, 1);
      }
    }
  });

  ctx.strokeStyle = '#f26b3a';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, BASE_WIDTH - 1, BASE_HEIGHT - 1);
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
