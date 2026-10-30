interface CardView {
  render: () => void;
  update: () => void;
  visible: boolean;
  dirty: boolean;
}

// Visibility controls presentation only. Simulation and gameplay timers run elsewhere.
export class VisibleCardUpdates {
  private views = new Map<Element, CardView>();
  private observer: IntersectionObserver | null;

  constructor() {
    this.observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      for (const entry of entries) {
        const view = this.views.get(entry.target);
        if (!view) continue;
        const visible = entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0;
        if (visible && !view.visible) view.dirty = true;
        view.visible = visible;
        if (visible) this.flush(view);
      }
    });
  }

  public register(id: string, render: () => void, update: () => void): void {
    const element = document.getElementById(id);
    if (!element) return;
    this.views.set(element, { render, update, visible: false, dirty: true });
    this.observer?.observe(element);
  }

  public invalidateAll(): void {
    for (const view of this.views.values()) view.dirty = true;
    this.update();
  }

  public update(): void {
    if (document.visibilityState === 'hidden') return;
    for (const [element, view] of this.views) {
      // Older browsers without IntersectionObserver still get correct visibility.
      if (!this.observer) {
        const rect = element.getBoundingClientRect();
        const visible = rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0
          && rect.left < window.innerWidth && rect.top < window.innerHeight;
        if (visible && !view.visible) view.dirty = true;
        view.visible = visible;
      }
      if (view.visible) this.flush(view);
    }
  }

  private flush(view: CardView): void {
    if (document.visibilityState === 'hidden') return;
    if (view.dirty) {
      view.dirty = false;
      view.render();
    }
    view.update();
  }

  public destroy(): void {
    this.observer?.disconnect();
    this.views.clear();
  }
}
