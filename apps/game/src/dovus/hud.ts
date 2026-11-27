import { def, type FightState, INTRO_FIGHT_AT, PHASE, timerSeconds } from '@dovus/fight';
import { el, setStyle, setText } from '../ui/dom';

/** Dövüş göstergesi (onaylı "Dövüş HUD" tasarımı): portre, can barı ve hasar izi, isim, raunt işaretleri, süre, kombo,
 *  güç göstergesi; ortada raunt duyuruları. DOM'da, ekranın gerçek çözünürlüğünde keskin. */

export interface HudNames {
  readonly p1: string;
  readonly p2: string;
}

export interface Hud {
  readonly root: HTMLElement;
  readonly announce: HTMLElement;
  update(s: FightState, names: HudNames): void;
}

/** Kombo bittikten sonra sayacın ekranda kalma süresi (çizim karesi). */
const COMBO_LINGER = 70;
/** Hasar izi kombo bitince bu hızla erir (% / çizim karesi). */
const TRAIL_MELT = 0.6;

interface Side {
  readonly health: HTMLElement;
  readonly fill: HTMLElement;
  readonly trail: HTMLElement;
  readonly name: HTMLElement;
  readonly marks: HTMLElement;
  readonly combo: HTMLElement;
  readonly comboCount: HTMLElement;
  readonly comboDamage: HTMLElement;
  trailPct: number;
  comboShown: number;
  comboLeft: number;
  marksKey: string;
}

function side(p: 1 | 2, root: HTMLElement): Side {
  const portrait = el('div', {
    class: `ds-portrait hud__portre hud__portre--p${p}${p === 2 ? ' ds-portrait--p2' : ''}`,
  });
  const frame = el('div', { class: 'ds-portrait__frame hud__cerceve' });
  frame.append(el('span', { class: `hud__yuz hud__yuz--p${p}` }));
  portrait.append(frame);

  const health = el('div', {
    class: `ds-health ds-health--p${p} ds-hud hud__can hud__can--p${p}`,
    'data-testid': `can-p${p}`,
  });
  const bar = el('div', { class: 'ds-health__bar' });
  const trail = el('span', { class: 'ds-health__trail' });
  const fill = el('span', { class: 'ds-health__fill', 'data-testid': `can-dolu-p${p}` });
  bar.append(trail, fill);
  const row = el('div', { class: `hud__satir hud__satir--p${p}` });
  const name = el('span', { class: `ds-plate hud__ad hud__ad--p${p}`, 'data-testid': `ad-p${p}` });
  const marks = el('div', { class: 'ds-marks', 'data-testid': `raunt-p${p}` });
  row.append(name, marks);
  health.append(bar, row);

  const combo = el('div', { class: `ds-combo hud__kombo hud__kombo--p${p}`, 'data-testid': `kombo-p${p}` });
  const comboRow = el('div', { class: 'ds-combo__row' });
  const comboCount = el('span', { class: 'ds-combo__count' });
  comboRow.append(comboCount, el('span', { class: 'ds-combo__word' }, 'VURUŞ'));
  const comboDamage = el('span', { class: 'ds-combo__damage ds-plate' });
  combo.append(comboRow, comboDamage);
  combo.hidden = true;

  const power = el('div', { class: `ds-power hud__guc hud__guc--p${p}` });
  const stocks = el('div', { class: 'ds-power__stocks' });
  for (let k = 0; k < 3; k++) {
    const stock = el('span', { class: 'ds-power__stock' });
    stock.append(el('i', { style: 'width: 0' }));
    stocks.append(stock);
  }
  power.append(el('span', { class: 'ds-power__level' }, '0'), stocks);

  root.append(portrait, health, combo, power);
  return {
    health,
    fill,
    trail,
    name,
    marks,
    combo,
    comboCount,
    comboDamage,
    trailPct: 100,
    comboShown: 0,
    comboLeft: 0,
    marksKey: '',
  };
}

export function createHud(stage: HTMLElement): Hud {
  const root = el('div', { class: 'hud', 'data-testid': 'hud' });
  const sides = [side(1, root), side(2, root)] as const;
  const timerBox = el('div', { class: 'hud__sure' });
  const timer = el('div', { class: 'ds-timer', 'data-testid': 'sure' }, '99');
  timerBox.append(timer);
  const pauseRow = el('div', { class: 'hud__durdur-satir' });
  const pause = el('span', { class: 'ds-plate hud__durdur' });
  pause.innerHTML = '<span class="key">Esc</span><span class="key">Options</span>Duraklat';
  pauseRow.append(pause);
  root.append(timerBox, pauseRow);

  const announce = el('div', { class: 'duyuru', 'data-testid': 'duyuru' });
  const big = el('span', { class: 'ds-plate ds-plate--big ds-plate--gems duyuru__ana', 'data-testid': 'duyuru-ana' });
  const sub = el('span', { class: 'ds-plate duyuru__alt', 'data-testid': 'duyuru-alt' });
  announce.append(big, sub);
  announce.hidden = true;
  stage.append(root, announce);

  function updateSide(k: 0 | 1, s: FightState, name: string): void {
    const ui = sides[k];
    const f = s.fighters[k];
    const other = s.fighters[k === 0 ? 1 : 0];
    const max = def(s, k).health;
    const pct = Math.max(0, (100 * f.hp) / max);
    // İz: kombo sürerken bekler, bitince erir; can arttıysa (antrenman) hemen eşitlenir.
    if (pct >= ui.trailPct) ui.trailPct = pct;
    else if (f.combo === 0) ui.trailPct = Math.max(pct, ui.trailPct - TRAIL_MELT);
    setStyle(ui.fill, 'width', `${pct.toFixed(2)}%`);
    setStyle(ui.trail, 'width', `${ui.trailPct.toFixed(2)}%`);
    ui.health.classList.toggle('is-low', pct < 25);
    setText(ui.name, name);

    const marksKey = `${s.roundsToWin}:${s.wins[k]}`;
    if (marksKey !== ui.marksKey) {
      ui.marksKey = marksKey;
      ui.marks.replaceChildren(
        ...Array.from({ length: s.roundsToWin }, (_, m) =>
          el('span', { class: `ds-mark${m < s.wins[k] ? ' is-won' : ''}` }),
        ),
      );
    }

    // Kombo, vuranın tarafında: rakibin yediği art arda vuruş.
    if (other.combo >= 2) {
      ui.comboShown = other.combo;
      ui.comboLeft = COMBO_LINGER;
      setText(ui.comboCount, String(other.combo));
      setText(ui.comboDamage, `%${Math.round((100 * other.comboDamage) / def(s, k === 0 ? 1 : 0).health)} hasar`);
    } else if (ui.comboLeft > 0) ui.comboLeft -= 1;
    ui.combo.hidden = ui.comboLeft === 0;
  }

  return {
    root,
    announce,
    update(s, names) {
      updateSide(0, s, names.p1);
      updateSide(1, s, names.p2);
      const secs = timerSeconds(s);
      setText(timer, s.training ? '∞' : String(secs));
      timer.classList.toggle('is-low', !s.training && secs <= 10);

      const [main, small] = announcement(s, names);
      announce.hidden = main === '';
      setText(big, main);
      setText(sub, small);
      sub.hidden = small === '';
    },
  };
}

/** Ortadaki duyuru: büyük yazı ve alt satır (boşsa gizli). */
export function announcement(s: FightState, names: HudNames): [string, string] {
  const who = (r: number): string => (r === 1 ? names.p1 : names.p2);
  switch (s.phase) {
    case PHASE.INTRO: {
      const last = s.roundsToWin > 1 && s.wins[0] === s.roundsToWin - 1 && s.wins[1] === s.roundsToWin - 1;
      if (s.phaseFrame < INTRO_FIGHT_AT) return [last ? 'SON RAUNT' : `RAUNT ${s.round}`, ''];
      return ['DÖVÜŞ!', ''];
    }
    case PHASE.ROUND_END: {
      const big = s.roundReason === 1 ? 'SÜRE BİTTİ' : s.roundResult === 3 ? 'ÇİFT K.O.' : 'K.O.';
      const small = s.roundResult === 3 ? 'BERABERE' : `${who(s.roundResult)} RAUNDU ALDI`;
      return [big, small];
    }
    case PHASE.MATCH_END: {
      if (s.winner === 2) return ['BERABERE', `${s.wins[0]} – ${s.wins[1]}`];
      return [`${who(s.winner + 1)} KAZANDI`, `${s.wins[0]} – ${s.wins[1]}`];
    }
    default:
      return ['', ''];
  }
}
