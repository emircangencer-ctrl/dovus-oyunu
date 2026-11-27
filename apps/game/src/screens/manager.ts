import { fitToWindow } from '../viewport/fit';

/** Tek sayfalık ekran yöneticisi: ekranlar arasında sayfa yenilenmez (tam ekran düşmesin, yükleme beklenmesin). */

export type Route =
  | { readonly name: 'menu'; readonly at?: string }
  | { readonly name: 'versus' }
  | { readonly name: 'antrenman' };

export interface ScreenCtx {
  readonly canvas: HTMLCanvasElement;
  readonly ui: HTMLElement;
  go(route: Route): void;
}

export interface Screen {
  /** 1920×1080 arayüz sahnesi; yönetici pencereye sığdırır. */
  readonly stage: HTMLElement;
  /** Dinleyicileri ve döngüleri kapatır. */
  stop(): void;
}

export type ScreenFactory = (route: Route, ctx: ScreenCtx) => Screen;

export function createApp(canvas: HTMLCanvasElement, ui: HTMLElement, factory: ScreenFactory): ScreenCtx {
  let current: Screen | null = null;
  const ctx: ScreenCtx = {
    canvas,
    ui,
    go(route) {
      current?.stop();
      ui.replaceChildren();
      current = factory(route, ctx);
      if (!current.stage.isConnected) ui.append(current.stage);
      fitToWindow(canvas, ui, current.stage);
      document.body.dataset.ekran = route.name;
    },
  };
  window.addEventListener('resize', () => {
    if (current) fitToWindow(canvas, ui, current.stage);
  });
  return ctx;
}
