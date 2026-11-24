export const BASE_WIDTH = 960;
export const BASE_HEIGHT = 540;

export type ScaleResult = {
  scale: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  pixelPerfect: boolean;
};

/**
 * Oyun alanını pencereye sığdırır. Mümkünse tam sayı kat (piksel keskin kalır),
 * pencere taban çözünürlükten küçükse oranı koruyarak küçültür. Alan pencerede ortalanır.
 */
export function computeScale(
  viewportWidth: number,
  viewportHeight: number,
  baseWidth: number = BASE_WIDTH,
  baseHeight: number = BASE_HEIGHT,
): ScaleResult {
  const fit = Math.min(viewportWidth / baseWidth, viewportHeight / baseHeight);
  const integer = Math.floor(fit);
  const pixelPerfect = integer >= 1;
  const scale = pixelPerfect ? integer : fit;
  const width = Math.round(baseWidth * scale);
  const height = Math.round(baseHeight * scale);
  return {
    scale,
    width,
    height,
    offsetX: Math.floor((viewportWidth - width) / 2),
    offsetY: Math.floor((viewportHeight - height) / 2),
    pixelPerfect,
  };
}
