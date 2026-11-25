import { computeScale } from './scale';

const UI_WIDTH = 1920;

/** Tuvali ve arayüz katmanını aynı tam sayı katla pencereye sığdırır; arayüz sahnesi (1920×1080) aynı kata ölçeklenir.
 *  Ölçek cihaz pikseliyle hesaplanır (Windows %125/%150 için). */
export function fitToWindow(canvas: HTMLElement, ui: HTMLElement, stage: HTMLElement): void {
  const dpr = window.devicePixelRatio || 1;
  const fit = computeScale(Math.floor(window.innerWidth * dpr), Math.floor(window.innerHeight * dpr));
  for (const node of [canvas, ui]) {
    node.style.width = `${fit.width / dpr}px`;
    node.style.height = `${fit.height / dpr}px`;
    node.style.left = `${fit.offsetX / dpr}px`;
    node.style.top = `${fit.offsetY / dpr}px`;
  }
  stage.style.transform = `scale(${fit.width / dpr / UI_WIDTH})`;
}

export function keepFitted(canvas: HTMLElement, ui: HTMLElement, stage: HTMLElement): void {
  fitToWindow(canvas, ui, stage);
  window.addEventListener('resize', () => fitToWindow(canvas, ui, stage));
}
