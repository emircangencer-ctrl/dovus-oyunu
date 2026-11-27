/** Dikey seçenek listesi (duraklatma, maç sonu): saf durum makinesi. */

export type ListAction = 'yukari' | 'asagi' | 'sec' | 'geri' | { odak: number } | { tikla: number };

export interface ListMenu {
  readonly items: readonly string[];
  readonly focus: number;
}

export interface ListResult {
  readonly menu: ListMenu;
  /** Seçilen sıra (onaylandıysa). */
  readonly chosen?: number;
  /** Geri basıldı (duraklatmada "devam"). */
  readonly back?: boolean;
}

export const listMenu = (items: readonly string[]): ListMenu => ({ items, focus: 0 });

export function listStep(m: ListMenu, a: ListAction): ListResult {
  const n = m.items.length;
  const ok = (i: number): boolean => Number.isInteger(i) && i >= 0 && i < n;
  if (typeof a === 'object') {
    if ('odak' in a) return { menu: ok(a.odak) ? { ...m, focus: a.odak } : m };
    return ok(a.tikla) ? { menu: { ...m, focus: a.tikla }, chosen: a.tikla } : { menu: m };
  }
  switch (a) {
    case 'yukari':
      return { menu: { ...m, focus: (m.focus - 1 + n) % n } };
    case 'asagi':
      return { menu: { ...m, focus: (m.focus + 1) % n } };
    case 'sec':
      return { menu: m, chosen: m.focus };
    case 'geri':
      return { menu: m, back: true };
  }
}
