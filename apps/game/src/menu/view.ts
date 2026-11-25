import { MENU_ITEMS, type MenuAction, type MenuState } from './menu-state';

const TOAST_MS = 1800;

export interface MenuView {
  /** 1920×1080 sahne; ölçek dışarıdan verilir. */
  readonly stage: HTMLElement;
  /** Sürüm satırı (duman testi bunu okur). */
  readonly version: HTMLElement;
  render(state: MenuState): void;
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

/** Başlık ekranı ve ana menüyü kale temasıyla kurar. Fare ve dokunma eylemleri onAction'a gider. */
export function createMenuView(host: HTMLElement, onAction: (a: MenuAction) => void): MenuView {
  const stage = el('div', { class: 'sahne', 'data-testid': 'sahne' });
  stage.append(el('img', { class: 'scr-bg', src: '/art/menu-bg.webp', alt: '' }), el('div', { class: 'scr-dim' }));

  // Başlık ekranı
  const title = el('section', { class: 'ekran baslik', 'data-testid': 'baslik', 'aria-label': 'Başlık ekranı' });
  title.append(
    el('img', { class: 'baslik__logo', src: '/art/logo.webp', alt: 'SysKO' }),
    el(
      'span',
      { class: 'ds-plate ds-plate--big ds-plate--gems baslik__bas', 'data-testid': 'bir-tusa-bas' },
      'BİR TUŞA BAS',
    ),
    el('p', { class: 'baslik__alt' }, 'Bir aile dövüş oyunu'),
  );
  title.addEventListener('click', () => onAction('herhangi'));

  // Ana menü
  const menu = el('section', { class: 'ekran menu', 'data-testid': 'ana-menu', 'aria-label': 'Ana menü' });
  const nav = el('nav', { class: 'menu__liste', 'aria-label': 'Ana menü' });
  const buttons = MENU_ITEMS.map((item, i) => {
    const b = el('button', {
      type: 'button',
      tabindex: '-1',
      class: `ds-btn ds-btn--wide${item.primary ? ' ds-btn--go' : ''}`,
      'data-testid': 'menu-secenek',
    });
    b.append(el('span', {}, item.label));
    if (item.soon) b.append(el('span', { class: 'ds-tag' }, 'YAKINDA'));
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('pointerenter', () => onAction({ odak: i }));
    b.addEventListener('click', () => onAction({ tikla: i }));
    nav.append(b);
    return b;
  });
  const info = el('section', { class: 'ds-panel ds-panel--ribbon menu__bilgi' });
  const infoTitle = el('span', { class: 'ds-ribbon', 'data-testid': 'bilgi-baslik' });
  const infoBody = el('p', { class: 'ds-panel__body menu__aciklama' });
  const infoState = el('p', { class: 'menu__durum' });
  infoState.append(
    el('span', { class: 'ds-tag' }, 'YAKINDA'),
    document.createTextNode(' Bu bölüm sonraki aşamalarda açılacak.'),
  );
  info.append(infoTitle, infoBody, infoState);
  const toast = el('div', {
    class: 'ds-toast ds-toast--soon menu__bildirim',
    role: 'status',
    'data-testid': 'bildirim',
  });
  const toastText = el('span', { class: 'ds-toast__kind' });
  toast.append(el('span', { class: 'ds-toast__dot' }), toastText);
  // Aşama 1 teknik kanıtı: Emir'in bilgisayarında ölçülen hız testi.
  const speedTest = el('a', { class: 'ds-tag menu__hiz', href: '/hiz-testi' }, 'HIZ TESTİ');
  menu.append(el('img', { class: 'menu__logo', src: '/art/logo.webp', alt: 'SysKO' }), nav, info, toast, speedTest);

  // Alt ipucu şeridi
  const hints = el('div', { class: 'ds-hints alt-serit' });
  const hintTitle = el('span', { class: 'ipucu' });
  hintTitle.innerHTML = '<span class="key">Enter</span>Başla';
  const hintMenu = el('span', { class: 'ipucu' });
  hintMenu.innerHTML =
    '<span class="key"><i class="ico ico-up"></i><i class="ico ico-down"></i></span>Gez <span class="key">Enter</span>Seç <span class="key">Esc</span>Geri';
  const version = el('span', { class: 'surum', id: 'surum', 'data-testid': 'surum' }, 'Sürüm: yükleniyor…');
  hints.append(hintTitle, hintMenu, el('span', { class: 'sp' }), version);

  stage.append(title, menu, hints);
  host.append(stage);

  let shownToast = 0;
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  return {
    stage,
    version,
    render(s: MenuState): void {
      const onTitle = s.screen === 'baslik';
      title.hidden = !onTitle;
      menu.hidden = onTitle;
      hintTitle.hidden = !onTitle;
      hintMenu.hidden = onTitle;

      buttons.forEach((b, i) => {
        const focused = i === s.focus;
        b.classList.toggle('is-focused', focused);
        if (focused) b.setAttribute('aria-current', 'true');
        else b.removeAttribute('aria-current');
      });
      const item = MENU_ITEMS[s.focus];
      if (item) {
        infoTitle.textContent = item.label;
        infoBody.textContent = item.about;
        infoState.hidden = item.ready;
      }

      if (s.toast && s.toast.id !== shownToast) {
        shownToast = s.toast.id;
        toastText.textContent = s.toast.text;
        toast.classList.add('is-on');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('is-on'), TOAST_MS);
      }
      if (!s.toast) {
        // Başlığa dönünce bildirim kimlikleri baştan sayar; gösterilen kimlik de sıfırlanır ki ilk bildirim kaçmasın.
        toast.classList.remove('is-on');
        shownToast = 0;
      }
    },
  };
}
