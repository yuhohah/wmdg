// Preserve the existing text node when a formatted value has not changed.
export function setText(element: Element | null, value: string): void {
  if (element && element.textContent !== value) element.textContent = value;
}
