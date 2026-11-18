// Preserve the existing text node when a formatted value has not changed.
export function setText(element: Element | null, value: string): void {
  if (element && element.textContent !== value) element.textContent = value;
}

// Avoid redundant style recalculations when inline display is already set.
export function setDisplay(element: HTMLElement | null, display: string): void {
  if (element && element.style.display !== display) element.style.display = display;
}

// The HUD bar box is shorter than the counters and buttons it floats, so use its lowest visible child (0 when hidden).
export function hudBottom(bar: Element | null): number {
  let bottom = 0;
  for (const child of Array.from(bar?.children ?? [])) {
    const rect = child.getBoundingClientRect();
    if (rect.height > 0) bottom = Math.max(bottom, rect.bottom);
  }
  return bottom;
}

// Toggle visibility of a top-bar HUD resource item and its preceding divider.
export function setHudSectionVisibility(
  dividerEl: HTMLElement | null,
  itemEl: HTMLElement | null,
  unlocked: boolean
): void {
  setDisplay(dividerEl, unlocked ? 'block' : 'none');
  setDisplay(itemEl, unlocked ? '' : 'none');
}
