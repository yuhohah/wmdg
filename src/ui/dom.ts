// Preserve the existing text node when a formatted value has not changed.
export function setText(element: Element | null, value: string): void {
  if (element && element.textContent !== value) element.textContent = value;
}

// Avoid redundant style recalculations when inline display is already set.
export function setDisplay(element: HTMLElement | null, display: string): void {
  if (element && element.style.display !== display) element.style.display = display;
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
