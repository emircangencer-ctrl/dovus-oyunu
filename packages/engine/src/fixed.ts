/** Sabit nokta: 1 taban pikseli (960×540 dünyası) = 256 birim. Simülasyon yalnız tam sayıyla çalışır. */
export const FX = 256;

export const toFx = (px: number): number => Math.imul(px, FX);

/** Birimden taban pikseline, aşağı yuvarlayarak (yalnız çizim için). */
export const fxToPx = (v: number): number => v >> 8;
