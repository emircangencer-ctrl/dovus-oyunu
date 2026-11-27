/** Küçük DOM yardımcısı: etiket, öznitelikler ve isteğe bağlı metinle öğe kurar. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Değişmediyse dokunmadan metin yazar (her karede düzen hesaplatmasın). */
export function setText(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

export function setStyle(node: HTMLElement, prop: 'width' | 'left' | 'right', value: string): void {
  if (node.style[prop] !== value) node.style[prop] = value;
}
