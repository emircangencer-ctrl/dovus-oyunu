/** Başlık ekranı ve ana menünün saf durum makinesi: girdi eylemi gelir, yeni durum döner. */

export type Screen = 'baslik' | 'menu';

export interface MenuItem {
  readonly id: string;
  readonly label: string;
  /** Hazır olan bölüm açılır; hazır olmayan "Yakında" bildirimi gösterir. */
  readonly ready: boolean;
  /** Menüde "YAKINDA" etiketiyle gösterilir. */
  readonly soon?: boolean;
  /** Yeşil ana eylem butonu. */
  readonly primary?: boolean;
  readonly about: string;
}

export const MENU_ITEMS: readonly MenuItem[] = [
  {
    id: 'arcade',
    label: 'ARCADE',
    ready: false,
    primary: true,
    about: 'Bilgisayara karşı sırayla dövüş; sonunda büyük rakip seni bekler.',
  },
  { id: 'versus', label: 'VERSUS', ready: true, about: 'Aynı bilgisayarda iki kişi karşı karşıya.' },
  {
    id: 'cevrimici',
    label: 'ÇEVRİMİÇİ OYNA',
    ready: false,
    about: 'Uzaktaki ailenle maç yap. Gündelik maçlar puanı etkilemez.',
  },
  { id: 'turnuva', label: 'TURNUVA', ready: false, about: 'Tek ya da çift eleme aile kupası düzenle.' },
  { id: 'antrenman', label: 'ANTRENMAN', ready: true, about: 'Hareketlerini kuklaya karşı dene, kombolarını çalış.' },
  { id: 'profil', label: 'PROFİL VE SIRALAMA', ready: false, about: 'Maçların, puanın ve sezon sıralaması.' },
  { id: 'ayarlar', label: 'AYARLAR', ready: false, about: 'Kontroller, görüntü ve ses.' },
];
// Karakter tasarımı oyuncu menüsünde yok: yalnız Emir'in yönetim panelinde (ayrı, korumalı adres).

export type MenuAction = 'yukari' | 'asagi' | 'sec' | 'geri' | 'herhangi' | { odak: number } | { tikla: number };

export interface MenuState {
  readonly screen: Screen;
  readonly focus: number;
  readonly toast: { readonly text: string; readonly id: number } | null;
  /** Hazır bir bölüm seçildi: ekran yöneticisi açar (her seçişte yeni kimlik). */
  readonly launch: { readonly id: string; readonly n: number } | null;
}

export const INITIAL: MenuState = { screen: 'baslik', focus: 0, toast: null, launch: null };

/** Bir bölümden dönünce ana menü o seçenekte açılır. */
export function menuAt(id: string): MenuState {
  const focus = Math.max(
    0,
    MENU_ITEMS.findIndex((i) => i.id === id),
  );
  return { screen: 'menu', focus, toast: null, launch: null };
}

const inRange = (i: number): boolean => Number.isInteger(i) && i >= 0 && i < MENU_ITEMS.length;

function choose(s: MenuState, index: number): MenuState {
  const item = MENU_ITEMS[index];
  if (!item) return s;
  if (item.ready) return { ...s, focus: index, toast: null, launch: { id: item.id, n: (s.launch?.n ?? 0) + 1 } };
  return { ...s, focus: index, toast: { text: `${item.label} · YAKINDA`, id: (s.toast?.id ?? 0) + 1 } };
}

export function step(s: MenuState, action: MenuAction): MenuState {
  if (s.screen === 'baslik') {
    if (action === 'geri' || (typeof action === 'object' && 'odak' in action)) return s;
    return { screen: 'menu', focus: s.focus, toast: null, launch: null };
  }

  if (typeof action === 'object') {
    if ('odak' in action) return inRange(action.odak) ? { ...s, focus: action.odak } : s;
    return inRange(action.tikla) ? choose(s, action.tikla) : s;
  }

  const n = MENU_ITEMS.length;
  switch (action) {
    case 'yukari':
      return { ...s, focus: (s.focus - 1 + n) % n };
    case 'asagi':
      return { ...s, focus: (s.focus + 1) % n };
    case 'sec':
      return choose(s, s.focus);
    case 'geri':
      return { screen: 'baslik', focus: s.focus, toast: null, launch: null };
    case 'herhangi':
      return s;
  }
}
