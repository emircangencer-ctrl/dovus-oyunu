import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

const TOKENS_PATH = resolvePath(import.meta.dirname, '../../apps/game/src/ui/tokens.json');

type ColorValue = string | Record<string, string>;
type Tokens = {
  color: { themes: Array<{ id: string }>; tokens: Array<{ name: string; value: ColorValue }> };
};

/** WCAG 2.x kontrast oranı: (L1 + 0.05) / (L2 + 0.05), L1 açık renk. */
export function contrastRatio(hexA: string, hexB: string): number {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** "color.<token-adı>" yolunu ilk temadaki #rrggbb değerine çözer; {takma-ad} zincirlerini izler. */
export function resolve(tokenPath: string, tokens: Tokens = loadTokens()): string {
  const [family, name] = tokenPath.split('.', 2);
  if (family !== 'color' || !name) throw new Error(`Desteklenmeyen token yolu: ${tokenPath}`);
  const theme = tokens.color.themes[0]?.id;
  let current = name;
  for (let depth = 0; depth < 16; depth++) {
    const token = tokens.color.tokens.find((t) => t.name === current);
    if (!token) throw new Error(`Token bulunamadı: ${current} (${tokenPath})`);
    const raw = typeof token.value === 'string' ? token.value : theme ? token.value[theme] : undefined;
    if (!raw) throw new Error(`Token değeri yok: ${current}`);
    const alias = /^\{([^}]+)\}$/.exec(raw);
    if (!alias?.[1]) return normalizeHex(raw);
    current = alias[1];
  }
  throw new Error(`Takma ad zinciri çok uzun: ${tokenPath}`);
}

function loadTokens(): Tokens {
  return JSON.parse(readFileSync(TOKENS_PATH, 'utf8')) as Tokens;
}

function normalizeHex(hex: string): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m?.[1]) throw new Error(`Geçersiz renk (yalnızca #rgb ya da #rrggbb): ${hex}`);
  const digits = m[1].length === 3 ? [...m[1]].map((d) => d + d).join('') : m[1];
  return `#${digits.toLowerCase()}`;
}

function relativeLuminance(hex: string): number {
  const n = normalizeHex(hex);
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
