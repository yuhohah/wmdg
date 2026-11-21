import { BoardLayout, WORLD_TOP } from './BoardLayout.js';
import { hudBottom } from './dom.js';

interface FollowMeasure {
  width: number;
  height: number;
  top: number;
  bottom: number;
  worldWidth: number;
  worldHeight: number;
}

export interface BoardCamera {
  panX: number;
  panY: number;
  zoom: number;
  focusedCardId: string;
}

export class BoardManager {
  private viewportEl: HTMLElement | null = null;
  private worldEl: HTMLElement | null = null;
  private zoomLevelEl: HTMLElement | null = null;

  // Viewport Transform State
  private panX: number = 0;
  private panY: number = 0;
  private zoom: number = 1.0;

  private minZoom: number = 0.35;
  private maxZoom: number = 1.6;

  // Target Camera State for Smooth Transitions
  private targetPanX: number = 0;
  private targetPanY: number = 0;
  private targetZoom: number = 1.0;
  private isCameraTransitioning: boolean = false;

  // Reading layout right after writing to the page forces a full layout, so the per-frame
  // battle camera reuses these until the window resizes or the camera is framed again.
  private followMeasure: FollowMeasure | null = null;
  private promptScale: number = -1;

  // Dragging State
  private isPointerDown: boolean = false;
  private activePointerId: number | null = null;
  private pointerStartX: number = 0;
  private pointerStartY: number = 0;
  private initialPanX: number = 0;
  private initialPanY: number = 0;
  public hasMoved: boolean = false;

  // Multi-touch Pinch & Coalesced Drag State
  private activePointers = new Map<number, { x: number; y: number }>();
  private initialPinchDistance: number = 0;
  private initialPinchZoom: number = 1.0;
  private initialPinchCenterWorld = { x: 0, y: 0 };
  private dragViewportRect: DOMRect | null = null;
  private dragMeasure: FollowMeasure | null = null;
  private dragCardCenters: Array<{ id: string; cx: number; cy: number }> = [];
  private panRafId: number | null = null;
  private pendingDragZoom: boolean = false;
  private pendingDragQuickNav: boolean = false;

  // Quick Navigation & Cards
  private cards = new Map<string, HTMLElement>();
  private completedCards = new Set<string>();
  private quickNavBtns = new Map<string, HTMLButtonElement>();
  public currentFocusedCardId: string = 'card-altar-sphere';

  // Drag & drop arrangement of the satellite cards
  private layout: BoardLayout | null = null;

  constructor() {
    this.initElements();
    if (this.viewportEl && this.worldEl) {
      const viewportEl = this.viewportEl;
      this.layout = new BoardLayout({
        getZoom: () => this.zoom,
        getPan: () => ({ x: this.panX, y: this.panY }),
        panBy: (dx, dy) => {
          this.isCameraTransitioning = false;
          this.panX += dx;
          this.panY += dy;
          this.applyTransform();
        },
        getViewport: () => viewportEl,
      }, this.worldEl);
    }
    this.bindEvents();
    window.requestAnimationFrame(() => {
      this.centerOnCard('card-altar-sphere', true);
    });
  }

  private initElements(): void {
    this.viewportEl = document.getElementById('dodeca-board-viewport');
    this.worldEl = document.getElementById('dodeca-board-world');
    this.zoomLevelEl = document.getElementById('board-zoom-level');

    // Register all cards on the board
    const cardElements = document.querySelectorAll<HTMLElement>('.dodeca-card, #card-unlocks');
    cardElements.forEach((card) => {
      if (card.id) {
        this.cards.set(card.id, card);
      }
    });

    // Register quick navigation buttons
    const navButtons = document.querySelectorAll<HTMLButtonElement>('.quicknav-btn');
    navButtons.forEach((btn) => {
      const targetId = btn.getAttribute('data-target');
      if (targetId) {
        this.quickNavBtns.set(targetId, btn);
      }
    });
  }

  private bindEvents(): void {
    if (!this.viewportEl || !this.worldEl) return;

    this.viewportEl.addEventListener('scroll', () => this.recoverNativeScroll(), { passive: true });

    this.cards.forEach((card) => {
      // The sphere has no visible header.
      if (card.id === 'card-altar-sphere') return;
      if (card.id === 'card-incarnation' || card.id === 'card-followers') {
        this.setCardCollapsed(card.id, false);
        return;
      }
      const header = card.querySelector<HTMLElement>('.dodeca-card-header');
      const body = card.querySelector<HTMLElement>('.dodeca-card-body');
      if (!header || !body) return;

      body.id ||= `${card.id}-body`;
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'dodeca-card-btn-toggle';
      toggle.setAttribute('aria-controls', body.id);
      toggle.addEventListener('click', () => {
        this.setCardCollapsed(card.id, !card.classList.contains('collapsed'));
      });
      header.appendChild(toggle);
      this.setCardCollapsed(card.id, card.classList.contains('collapsed'));
    });

    // 1. Mouse Wheel Zoom (centered at mouse coordinates)
    this.viewportEl.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      this.isCameraTransitioning = false;

      const rect = this.viewportEl!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate world coordinates before zoom
      const worldX = (mouseX - this.panX) / this.zoom;
      const worldY = (mouseY - this.panY) / this.zoom;

      // Multiplicative zoom step
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * zoomFactor));

      // Recalculate panX and panY so cursor remains fixed in world
      this.panX = mouseX - worldX * newZoom;
      this.panY = mouseY - worldY * newZoom;
      this.zoom = newZoom;

      this.applyTransform();
      this.updateZoomIndicator();
      this.updateActiveQuickNav();
    }, { passive: false });

    // 2. Pointer Down (Drag start / Touch start)
    this.viewportEl.addEventListener('pointerdown', (e: PointerEvent) => {
      // Track multi-touch
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.activePointers.size === 2) {
        this.layout?.cancelPending();
        const pts = Array.from(this.activePointers.values());
        this.initialPinchDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        this.initialPinchZoom = this.zoom;
        this.captureDragGeometry();
        const rect = this.dragViewportRect ?? this.viewportEl!.getBoundingClientRect();
        const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
        const midY = (pts[0].y + pts[1].y) / 2 - rect.top;
        this.initialPinchCenterWorld = {
          x: (midX - this.panX) / this.zoom,
          y: (midY - this.panY) / this.zoom
        };
        return;
      }

      const target = e.target as HTMLElement;

      // Card headers pick the card up (mouse instantly, touch on long press) instead of panning the board
      const headerCard = this.layout?.getHeaderCard(target);
      if (headerCard && this.layout) {
        const pickedUp = this.layout.beginPress(headerCard, e, () => this.cancelPan());
        if (pickedUp) return;
      }

      // Controls keep their clicks; the remaining card surface can pan the board.
      const isInteractive = !!target.closest(
        'button, a, input, select, textarea, canvas, label, [role="button"], .cult-action-card, .relic-action-card, .gnose-tree-node, .incarnation-altar-container, .board-quicknav-bar, .board-zoom-controls'
      );

      if (isInteractive && e.button !== 1) {
        return;
      }

      this.isPointerDown = true;
      this.activePointerId = e.pointerId;
      this.pointerStartX = e.clientX;
      this.pointerStartY = e.clientY;
      this.initialPanX = this.panX;
      this.initialPanY = this.panY;
      this.hasMoved = false;
      this.isCameraTransitioning = false;
      this.captureDragGeometry();
    });

    // 3. Pointer Move (Dragging / Panning)
    this.viewportEl.addEventListener('pointermove', (e: PointerEvent) => {
      if (this.activePointers.has(e.pointerId)) {
        this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      // Handle 2-finger pinch
      if (this.activePointers.size === 2) {
        const iter = this.activePointers.values();
        const p0 = iter.next().value!;
        const p1 = iter.next().value!;
        const currentDist = Math.hypot(p0.x - p1.x, p0.y - p1.y);
        if (this.initialPinchDistance > 10) {
          const pinchFactor = currentDist / this.initialPinchDistance;
          const newZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.initialPinchZoom * pinchFactor));
          const rect = this.dragViewportRect ?? this.viewportEl!.getBoundingClientRect();
          const midX = (p0.x + p1.x) / 2 - rect.left;
          const midY = (p0.y + p1.y) / 2 - rect.top;

          this.panX = midX - this.initialPinchCenterWorld.x * newZoom;
          this.panY = midY - this.initialPinchCenterWorld.y * newZoom;
          this.zoom = newZoom;

          this.scheduleDragFrame(true, false);
        }
        return;
      }

      if (!this.isPointerDown || e.pointerId !== this.activePointerId) return;

      const deltaX = e.clientX - this.pointerStartX;
      const deltaY = e.clientY - this.pointerStartY;

      if (!this.hasMoved && (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4)) {
        this.hasMoved = true;
        this.viewportEl?.classList.add('is-dragging');
        try {
          this.viewportEl?.setPointerCapture(e.pointerId);
        } catch {
          // ignore if capture unavailable
        }
      }

      if (!this.hasMoved) return;

      this.panX = this.initialPanX + deltaX;
      this.panY = this.initialPanY + deltaY;

      this.scheduleDragFrame(false, true);
    });

    // 4. Pointer Up / Cancel
    const endPointer = (e: PointerEvent) => {
      this.activePointers.delete(e.pointerId);

      if (e.pointerId === this.activePointerId) {
        this.flushDragFrame();
        this.isPointerDown = false;
        this.activePointerId = null;
        this.clearDragGeometry();
        this.viewportEl?.classList.remove('is-dragging');
        try {
          this.viewportEl?.releasePointerCapture(e.pointerId);
        } catch {
          // pointer capture might already be released
        }
      } else if (this.activePointers.size === 0) {
        this.flushDragFrame();
        this.clearDragGeometry();
      }
    };

    this.viewportEl.addEventListener('pointerup', endPointer);
    this.viewportEl.addEventListener('pointercancel', endPointer);

    // 6. Quick Navigation Buttons
    this.quickNavBtns.forEach((btn, targetId) => {
      btn.addEventListener('click', () => {
        this.centerOnCard(targetId);
      });
    });

    // 7. On-Screen Zoom Controls
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
      this.zoomAtCenter(1.2);
    });

    document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
      this.zoomAtCenter(0.83);
    });

    document.getElementById('btn-zoom-reset')?.addEventListener('click', () => {
      this.centerOnCard('card-altar-sphere');
    });

    document.getElementById('btn-layout-reset')?.addEventListener('click', () => {
      this.layout?.resetLayout();
    });

    // 8. Window Resize: re-center active card inside safe viewport
    window.addEventListener('resize', () => {
      this.invalidateFollowMeasure();
      // Let responsive card sizes and overlap resolution settle before framing them.
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        if (this.currentFocusedCardId) {
          this.centerOnCard(this.currentFocusedCardId, true);
        } else {
          this.applyTransform();
        }
      }));
    });
  }

  public setCardCollapsed(cardId: string, collapsed: boolean): void {
    if (cardId === 'card-incarnation' || cardId === 'card-followers') collapsed = false;
    const card = this.cards.get(cardId);
    if (!card) return;
    const toggle = card.querySelector<HTMLButtonElement>('.dodeca-card-btn-toggle');
    const body = card.querySelector<HTMLElement>('.dodeca-card-body');
    const title = card.querySelector('.dodeca-card-title')?.textContent?.trim() ?? 'card';
    if (collapsed && document.activeElement && body?.contains(document.activeElement)) {
      toggle?.focus({ preventScroll: true });
    }
    card.classList.toggle('collapsed', collapsed);
    if (toggle) {
      toggle.textContent = collapsed ? '+' : '−';
      toggle.setAttribute('aria-expanded', String(!collapsed));
      toggle.setAttribute('aria-label', `${collapsed ? 'Expandir' : 'Minimizar'} ${title}`);
      toggle.title = `${collapsed ? 'Expandir' : 'Minimizar'} ${title}`;
    }
  }

  /** Collapse on completion once, allowing manual reopening until purchases reset. */
  public setCardCompleted(cardId: string, complete: boolean): void {
    if (cardId !== 'card-relics') return;
    if (!complete) {
      if (this.completedCards.delete(cardId)) this.setCardCollapsed(cardId, false);
    } else if (!this.completedCards.has(cardId) && this.cards.has(cardId)) {
      this.completedCards.add(cardId);
      this.setCardCollapsed(cardId, true);
    }
  }

  private captureDragGeometry(): void {
    if (!this.viewportEl || !this.worldEl) return;
    this.dragViewportRect = this.viewportEl.getBoundingClientRect();
    this.dragMeasure = this.measureFollow(this.viewportEl, this.worldEl);
    this.dragCardCenters.length = 0;
    this.cards.forEach((card, id) => {
      if (card.style.display === 'none') return;
      this.dragCardCenters.push({
        id,
        cx: card.offsetLeft + card.offsetWidth / 2,
        cy: card.offsetTop + card.offsetHeight / 2,
      });
    });
  }

  private clearDragGeometry(): void {
    this.dragViewportRect = null;
    this.dragMeasure = null;
    this.dragCardCenters.length = 0;
  }

  private scheduleDragFrame(updateZoom: boolean, updateQuickNav: boolean): void {
    if (updateZoom) this.pendingDragZoom = true;
    if (updateQuickNav) this.pendingDragQuickNav = true;
    if (this.panRafId !== null) return;
    this.panRafId = window.requestAnimationFrame(() => {
      this.panRafId = null;
      const measure = this.dragMeasure ?? undefined;
      this.applyTransform(measure);
      if (this.pendingDragZoom) {
        this.pendingDragZoom = false;
        this.updateZoomIndicator();
      }
      if (this.pendingDragQuickNav) {
        this.pendingDragQuickNav = false;
        this.updateActiveQuickNav(measure, this.dragCardCenters.length > 0 ? this.dragCardCenters : undefined);
      }
    });
  }

  private flushDragFrame(): void {
    if (this.panRafId !== null) {
      window.cancelAnimationFrame(this.panRafId);
      this.panRafId = null;
    }
    const hadZoom = this.pendingDragZoom;
    const hadQuickNav = this.pendingDragQuickNav;
    this.pendingDragZoom = false;
    this.pendingDragQuickNav = false;
    if (hadZoom || hadQuickNav) {
      const measure = this.dragMeasure ?? undefined;
      this.applyTransform(measure);
      if (hadZoom) this.updateZoomIndicator();
      if (hadQuickNav) {
        this.updateActiveQuickNav(measure, this.dragCardCenters.length > 0 ? this.dragCardCenters : undefined);
      }
    }
  }

  // Abort an in-progress pan (a long press turned it into a card drag) and undo its small drift
  private cancelPan(): void {
    if (this.panRafId !== null) {
      window.cancelAnimationFrame(this.panRafId);
      this.panRafId = null;
      this.pendingDragZoom = false;
      this.pendingDragQuickNav = false;
    }
    if (this.activePointerId !== null) {
      try {
        this.viewportEl?.releasePointerCapture(this.activePointerId);
      } catch {
        // pointer capture might already be released
      }
    }
    if (this.hasMoved) {
      this.panX = this.initialPanX;
      this.panY = this.initialPanY;
      this.applyTransform();
    }
    this.isPointerDown = false;
    this.activePointerId = null;
    this.hasMoved = false;
    this.clearDragGeometry();
    this.viewportEl?.classList.remove('is-dragging');
  }

  // Keep the camera centre inside the play area so panning never drifts off into the void
  private clampPan(measure?: FollowMeasure): void {
    if (!this.viewportEl || !this.worldEl) return;
    const halfW = (measure?.width ?? (this.viewportEl.clientWidth || window.innerWidth)) / 2;
    const halfH = (measure?.height ?? (this.viewportEl.clientHeight || window.innerHeight)) / 2;
    const worldWidth = measure?.worldWidth ?? this.worldEl.offsetWidth;
    const worldHeight = measure?.worldHeight ?? this.worldEl.offsetHeight;
    const centerX = Math.min(worldWidth, Math.max(0, (halfW - this.panX) / this.zoom));
    const centerY = Math.min(worldHeight, Math.max(WORLD_TOP, (halfH - this.panY) / this.zoom));
    this.panX = halfW - centerX * this.zoom;
    this.panY = halfH - centerY * this.zoom;
  }

  // Native focus scrolling is independent of pan and can make the left side unreachable.
  // Recover that offset as well, including sessions already shifted before this fix.
  private recoverNativeScroll(): void {
    if (this.viewportEl?.scrollLeft) this.viewportEl.scrollLeft = 0;
    if (this.viewportEl?.scrollTop) this.viewportEl.scrollTop = 0;
  }

  private applyTransform(measure?: FollowMeasure): void {
    if (!this.worldEl) return;
    if (!measure) this.recoverNativeScroll();
    this.clampPan(measure);
    // A variable on the world root restyles every card, so write it only when it visibly changes.
    const promptScale = Math.round(Math.min(2.4, 1 / this.zoom) * 100) / 100;
    if (promptScale !== this.promptScale) {
      this.promptScale = promptScale;
      this.worldEl.style.setProperty('--boss-prompt-scale', String(promptScale));
    }
    const transform = `translate3d(${this.panX.toFixed(2)}px, ${this.panY.toFixed(2)}px, 0) scale(${this.zoom.toFixed(4)})`;
    if (this.worldEl.style.transform !== transform) {
      this.worldEl.style.setProperty('transform', transform, 'important');
    }
  }

  private updateZoomIndicator(): void {
    const text = `${Math.round(this.zoom * 100)}%`;
    if (this.zoomLevelEl && this.zoomLevelEl.textContent !== text) this.zoomLevelEl.textContent = text;
  }

  public zoomAtCenter(factor: number): void {
    if (!this.viewportEl) return;
    this.isCameraTransitioning = false;

    const rect = this.viewportEl.getBoundingClientRect();
    const centerX = (rect.width || window.innerWidth) / 2;
    const centerY = (rect.height || window.innerHeight) / 2;

    const worldX = (centerX - this.panX) / this.zoom;
    const worldY = (centerY - this.panY) / this.zoom;

    const newZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * factor));
    this.panX = centerX - worldX * newZoom;
    this.panY = centerY - worldY * newZoom;
    this.zoom = newZoom;

    this.applyTransform();
    this.updateZoomIndicator();
  }

  /** Follow a world actor or frame the arena without native scrolling or overlapping camera transitions. */
  public followWorldTarget(target: { x: number; y: number; width: number; height: number }, elapsedSec: number): void {
    if (!this.viewportEl || !this.worldEl) return;
    this.isCameraTransitioning = false;
    if (elapsedSec <= 0) this.invalidateFollowMeasure();
    const measure = this.followMeasure ??= this.measureFollow(this.viewportEl, this.worldEl);
    const { width, height, top, bottom } = measure;
    const sidePad = width <= 860 ? 24 : 64;
    const availH = Math.max(120, height - top - bottom);
    const zoom = Math.max(this.minZoom, Math.min(1.1, Math.max(120, width - sidePad) / target.width, availH / target.height));
    const panX = width / 2 - target.x * zoom;
    const panY = top + availH / 2 - target.y * zoom;
    const blend = elapsedSec <= 0 ? 1 : 1 - Math.exp(-6 * Math.min(0.1, elapsedSec));
    let nextPanX = this.panX + (panX - this.panX) * blend;
    let nextPanY = this.panY + (panY - this.panY) * blend;
    let nextZoom = this.zoom + (zoom - this.zoom) * blend;
    if (Math.abs(zoom - nextZoom) < 0.002) nextZoom = zoom;
    if (Math.abs(panX - nextPanX) < 0.5) nextPanX = panX;
    if (Math.abs(panY - nextPanY) < 0.5) nextPanY = panY;
    if (
      elapsedSec > 0 &&
      Math.abs(nextPanX - this.panX) < 0.05 &&
      Math.abs(nextPanY - this.panY) < 0.05 &&
      Math.abs(nextZoom - this.zoom) < 0.0002
    ) {
      return;
    }
    this.panX = nextPanX;
    this.panY = nextPanY;
    this.zoom = nextZoom;
    this.applyTransform(measure);
    this.updateZoomIndicator();
  }

  private invalidateFollowMeasure(): void {
    this.followMeasure = null;
  }

  private measureBottomSafe(viewHeight: number, isMobile: boolean): number {
    let minTop = viewHeight;
    let foundVisible = false;
    const controls = [
      document.getElementById('board-quicknav-bar'),
      document.querySelector<HTMLElement>('.board-zoom-controls'),
    ];
    for (const el of controls) {
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (rect.height <= 0 || rect.width <= 0) continue;
      const computed = window.getComputedStyle(el);
      if (computed.display === 'none' || computed.visibility === 'hidden' || parseFloat(computed.opacity) === 0) {
        continue;
      }
      foundVisible = true;
      if (rect.top < minTop) minTop = rect.top;
    }
    if (!foundVisible) {
      return isMobile ? 54 : 32;
    }
    return Math.min(Math.round(viewHeight * 0.45), Math.max(16, Math.round(viewHeight - minTop + 10)));
  }

  private measureFollow(viewportEl: HTMLElement, worldEl: HTMLElement): FollowMeasure {
    this.recoverNativeScroll();
    const width = viewportEl.clientWidth || window.innerWidth;
    const height = viewportEl.clientHeight || window.innerHeight;
    const isMobile = width <= 860;
    const hud = hudBottom(document.querySelector('.top-hud-bar'));
    return {
      width,
      height,
      top: Math.min(Math.round(height * 0.45), Math.max(isMobile ? 54 : 90, Math.round(hud + 10))),
      bottom: this.measureBottomSafe(height, isMobile),
      worldWidth: worldEl.offsetWidth,
      worldHeight: worldEl.offsetHeight,
    };
  }

  public centerOnCard(cardId: string, immediate: boolean = false, targetSelector?: string): void {
    const card = this.cards.get(cardId);
    if (!card || !this.viewportEl) return;
    this.invalidateFollowMeasure();

    this.currentFocusedCardId = cardId;
    if (targetSelector) this.setCardCollapsed(cardId, false);

    const viewWidth = this.viewportEl.clientWidth || window.innerWidth;
    const viewHeight = this.viewportEl.clientHeight || window.innerHeight;
    const isMobile = viewWidth <= 860;

    // Safe viewport margins accounting for Top HUD and visible Bottom Controls
    const hud = hudBottom(document.querySelector('.top-hud-bar'));
    const topSafe = hud > 0
      ? Math.min(Math.round(viewHeight * 0.45), Math.round(hud + 8))
      : (isMobile ? 54 : 76);

    const bottomSafe = this.measureBottomSafe(viewHeight, isMobile);

    const sidePad = isMobile ? 8 : 28;
    const availW = Math.max(180, viewWidth - sidePad * 2);
    const availH = Math.max(120, viewHeight - topSafe - bottomSafe);

    const style = window.getComputedStyle(card);
    const cardLeft = card.offsetLeft || parseFloat(style.left) || 1490;
    const cardTop = card.offsetTop || parseFloat(style.top) || 560;
    const cardWidth = card.offsetWidth || parseFloat(style.width) || 360;
    const cardHeight = card.offsetHeight || parseFloat(style.height) || 360;

    let cardCenterX = cardLeft + cardWidth / 2;
    let cardCenterY = cardTop + cardHeight / 2;
    let targetZoom = 1.0;

    if (cardId === 'card-altar-sphere') {
      const bossActive = document.body.classList.contains('is-boss-battle-active');
      if (bossActive) {
        // Frame the full sacred circle of Faithful + Incarnation surrounding both Boss and Sphere
        cardCenterY = cardTop + cardHeight * 0.42;
        targetZoom = Math.max(this.minZoom, Math.min(0.92, availW / 1210, availH / 1210));
      } else {
        const unlockCard = this.cards.get('card-unlocks');
        const unlockVisible = unlockCard && unlockCard.style.display !== 'none';
        if (unlockVisible) {
          // Frame both the Sphere and the Unlock Seal button below it
          cardCenterY = cardTop + cardHeight * 0.62;
        }
        targetZoom = isMobile
          ? Math.max(this.minZoom, Math.min(0.98, availW / 340, availH / (unlockVisible ? 430 : 350)))
          : Math.max(0.85, Math.min(1.0, availH / 540));
      }
    } else {
      const maxDesiredZoom = 1.0;
      const fitW = availW / cardWidth;
      targetZoom = Math.max(this.minZoom, Math.min(maxDesiredZoom, fitW));
      // Frame the top of long cards at readable scale; pan the board to reach the rest.
      cardCenterY = cardTop + Math.min(cardHeight, availH / targetZoom) / 2;
    }

    if (targetSelector) {
      const target = card.querySelector<HTMLElement>(targetSelector);
      const rect = target?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        const viewport = this.viewportEl.getBoundingClientRect();
        cardCenterX = (rect.left + rect.width / 2 - viewport.left - this.panX) / this.zoom;
        cardCenterY = (rect.top + rect.height / 2 - viewport.top - this.panY) / this.zoom;
      }
    }

    const safeCenterX = viewWidth / 2;
    const safeCenterY = topSafe + availH / 2;

    const targetPanX = safeCenterX - cardCenterX * targetZoom;
    const targetPanY = safeCenterY - cardCenterY * targetZoom;

    this.highlightCard(card);

    if (immediate) {
      this.panX = targetPanX;
      this.panY = targetPanY;
      this.zoom = targetZoom;
      this.applyTransform();
      this.updateZoomIndicator();
      this.updateActiveQuickNav();
      return;
    }

    this.animateTo(targetPanX, targetPanY, targetZoom);
  }

  /** Where the camera rests, or is heading if a move is still animating. */
  public getCamera(): BoardCamera {
    const moving = this.isCameraTransitioning;
    return {
      panX: moving ? this.targetPanX : this.panX,
      panY: moving ? this.targetPanY : this.panY,
      zoom: moving ? this.targetZoom : this.zoom,
      focusedCardId: this.currentFocusedCardId,
    };
  }

  public restoreCamera(camera: BoardCamera): void {
    this.currentFocusedCardId = camera.focusedCardId;
    this.animateTo(camera.panX, camera.panY, camera.zoom);
  }

  private animateTo(targetPanX: number, targetPanY: number, targetZoom: number): void {
    this.targetPanX = targetPanX;
    this.targetPanY = targetPanY;
    this.targetZoom = targetZoom;
    this.isCameraTransitioning = true;

    const startTime = performance.now();
    const duration = 450;
    const startPanX = this.panX;
    const startPanY = this.panY;
    const startZoom = this.zoom;

    const animate = (currentTime: number) => {
      if (!this.isCameraTransitioning) return;

      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);

      this.panX = startPanX + (this.targetPanX - startPanX) * ease;
      this.panY = startPanY + (this.targetPanY - startPanY) * ease;
      this.zoom = startZoom + (this.targetZoom - startZoom) * ease;

      this.applyTransform();
      this.updateZoomIndicator();

      if (progress < 1) {
        window.requestAnimationFrame(animate);
      } else {
        this.isCameraTransitioning = false;
        this.updateActiveQuickNav();
      }
    };

    window.requestAnimationFrame(animate);
  }

  private highlightCard(card: HTMLElement): void {
    this.cards.forEach((c) => c.classList.remove('focused-glow'));
    card.classList.add('focused-glow');
    setTimeout(() => {
      card.classList.remove('focused-glow');
    }, 2000);
  }

  private updateActiveQuickNav(
    measure?: FollowMeasure,
    cardCenters?: ReadonlyArray<{ id: string; cx: number; cy: number }>
  ): void {
    if (!this.viewportEl) return;
    const viewWidth = measure?.width ?? (this.viewportEl.clientWidth || window.innerWidth);
    const viewHeight = measure?.height ?? (this.viewportEl.clientHeight || window.innerHeight);

    const currentCenterWorldX = (viewWidth / 2 - this.panX) / this.zoom;
    const currentCenterWorldY = (viewHeight / 2 - this.panY) / this.zoom;

    let closestCardId = 'card-altar-sphere';
    let minDistance = Infinity;

    if (cardCenters) {
      for (let i = 0; i < cardCenters.length; i++) {
        const { id, cx, cy } = cardCenters[i];
        const dist = Math.hypot(currentCenterWorldX - cx, currentCenterWorldY - cy);
        if (dist < minDistance) {
          minDistance = dist;
          closestCardId = id;
        }
      }
    } else {
      this.cards.forEach((card, id) => {
        if (card.style.display === 'none') return;
        const cx = card.offsetLeft + card.offsetWidth / 2;
        const cy = card.offsetTop + card.offsetHeight / 2;
        const dist = Math.hypot(currentCenterWorldX - cx, currentCenterWorldY - cy);
        if (dist < minDistance) {
          minDistance = dist;
          closestCardId = id;
        }
      });
    }

    this.quickNavBtns.forEach((btn, targetId) => {
      const isActive = targetId === closestCardId;
      if (btn.classList.contains('active') !== isActive) {
        btn.classList.toggle('active', isActive);
      }
    });
  }

  public setCardUnlocked(cardId: string, unlocked: boolean): void {
    const card = this.cards.get(cardId);
    if (card) {
      const lockOverlay = card.querySelector<HTMLElement>('.dodeca-card-locked-overlay');
      if (lockOverlay) {
        lockOverlay.style.display = 'none';
      }
      card.classList.toggle('card-locked', !unlocked);
      card.style.display = unlocked ? 'flex' : 'none';
    }

    const rayId = `ray-${cardId.replace('card-', '')}`;
    const rayEl = document.getElementById(rayId);
    if (rayEl) {
      rayEl.style.display = unlocked ? '' : 'none';
    }

    const quickBtn = this.quickNavBtns.get(cardId);
    if (quickBtn) {
      quickBtn.style.display = unlocked ? 'inline-flex' : 'none';
    }
  }
}
