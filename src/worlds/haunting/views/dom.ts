/** Ein Element mit Klasse und Text — `textContent`, nie `innerHTML`. */
export function el(tag: string, className = '', text = ''): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** Ein Knopf mit einem `data-`-Schlüssel, an dem ein Klick erkannt wird. */
export function key(
  className: string,
  text: string,
  data: Record<string, string>,
): HTMLButtonElement {
  const node = document.createElement('button');
  node.className = className;
  node.textContent = text;
  for (const [name, value] of Object.entries(data)) node.dataset[name] = value;
  return node;
}
