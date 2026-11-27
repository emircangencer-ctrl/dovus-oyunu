import { toFx } from '@dovus/engine';

/** Sahne ölçüleri, taban pikseli (960×540 ekran). Sahne 1,5 ekran genişliğinde; kamera yalnız yatay kayar. */
export const SCREEN_W = 960;
export const STAGE_W = 1440;
export const FLOOR_Y = 440;
/** Dövüşçünün (ayak ortası) gidebileceği en sol ve en sağ nokta. */
export const STAGE_LEFT = 40;
export const STAGE_RIGHT = STAGE_W - 40;
/** İki dövüşçü aynı ekranda kalsın: aradaki en büyük mesafe (ekran genişliği eksi iki kenar payı). */
export const MAX_SEPARATION = SCREEN_W - 2 * 40;
/** Başlangıç: sahnenin ortasından ±150 piksel. */
export const START_OFFSET = 150;

export const FLOOR = toFx(FLOOR_Y);
