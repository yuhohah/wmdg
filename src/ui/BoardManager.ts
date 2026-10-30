import { BoardLayout } from './BoardLayout.js';

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

  // Dragging State
  private isPointerDown: boolean = false;
  private activePointerId: number | null = null;
  private pointerStartX: number = 0;
  private pointerStartY: number = 0;
  private initialPanX: number = 0;
  private initialPanY: number = 0;
  public hasMoved: boolean = false;

  // Multi-touch Pinch State
  private activePointers = new Map<number, { x: number; y: number }>();
  private initialPinchDistance: number = 0;
  private initialPinchZoom: number = 1.0;
  private initialPinchCenterWorld = { x: 0, y: 0 };

  // Quick Navigation & Cards
  private cards = new Map<string, HTMLElement>();
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

    this.cards.forEach((card) => {
      // The sphere has no visible header.
      if (card.id === 'card-altar-sphere') return;
      const header = card.querySelector<HTMLElement>('.dodeca-card-header');
      const body = card.querySelector<HTMLElement>('.dodeca-card-body');
      if (!header || !body) return;

      body.id ||= `${card.id}-body`;
      const title = header.querySelector('.dodeca-card-title')?.textContent?.trim() ?? 'card';
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'dodeca-card-btn-toggle';
      toggle.setAttribute('aria-controls', body.id);
      const updateToggle = () => {
        const collapsed = card.classList.contains('collapsed');
        toggle.textContent = collapsed ? '+' : '−';
        toggle.setAttribute('aria-expanded', String(!collapsed));
        toggle.setAttribute('aria-label', `${collapsed ? 'Expandir' : 'Minimizar'} ${title}`);
        toggle.title = `${collapsed ? 'Expandir' : 'Minimizar'} ${title}`;
      };
      updateToggle();
      toggle.addEventListener('click', () => {
        card.classList.toggle('collapsed');
        updateToggle();
      });
      header.appendChild(toggle);
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
        const rect = this.viewportEl!.getBoundingClientRect();
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
    });

    // 3. Pointer Move (Dragging / Panning)
    this.viewportEl.addEventListener('pointermove', (e: PointerEvent) => {
      if (this.activePointers.has(e.pointerId)) {
        this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      // Handle 2-finger pinch
      if (this.activePointers.size === 2) {
        const pts = Array.from(this.activePointers.values());
        const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (this.initialPinchDistance > 10) {
          const pinchFactor = currentDist / this.initialPinchDistance;
          const newZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.initialPinchZoom * pinchFactor));
          const rect = this.viewportEl!.getBoundingClientRect();
          const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
          const midY = (pts[0].y + pts[1].y) / 2 - rect.top;

          this.panX = midX - this.initialPinchCenterWorld.x * newZoom;
          this.panY = midY - this.initialPinchCenterWorld.y * newZoom;
          this.zoom = newZoom;

          this.applyTransform();
          this.updateZoomIndicator();
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

      this.applyTransform();
      this.updateActiveQuickNav();
    });

    // 4. Pointer Up / Cancel
    const endPointer = (e: PointerEvent) => {
      this.activePointers.delete(e.pointerId);

      if (e.pointerId === this.activePointerId) {
        this.isPointerDown = false;
        this.activePointerId = null;
        this.viewportEl?.classList.remove('is-dragging');
        try {
          this.viewportEl?.releasePointerCapture(e.pointerId);
        } catch {
          // pointer capture might already be released
        }
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

  // Abort an in-progress pan (a long press turned it into a card drag) and undo its small drift
  private cancelPan(): void {
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
    this.viewportEl?.classList.remove('is-dragging');
  }

  // Keep the camera centre inside the play area so panning never drifts off into the void
  private clampPan(): void {
    if (!this.viewportEl || !this.worldEl) return;
    const halfW = (this.viewportEl.clientWidth || window.innerWidth) / 2;
    const halfH = (this.viewportEl.clientHeight || window.innerHeight) / 2;
    const centerX = Math.min(this.worldEl.offsetWidth, Math.max(0, (halfW - this.panX) / this.zoom));
    const centerY = Math.min(this.worldEl.offsetHeight, Math.max(0, (halfH - this.panY) / this.zoom));
    this.panX = halfW - centerX * this.zoom;
    this.panY = halfH - centerY * this.zoom;
  }

  private applyTransform(): void {
    if (!this.worldEl) return;
    this.clampPan();
    this.worldEl.style.setProperty('transform', `translate3d(${this.panX}px, ${this.panY}px, 0) scale(${this.zoom})`, 'important');
  }

  private updateZoomIndicator(): void {
    if (this.zoomLevelEl) {
      this.zoomLevelEl.textContent = `${Math.round(this.zoom * 100)}%`;
    }
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

  public centerOnCard(cardId: string, immediate: boolean = false): void {
    const card = this.cards.get(cardId);
    if (!card || !this.viewportEl) return;

    this.currentFocusedCardId = cardId;

    const viewWidth = this.viewportEl.clientWidth || window.innerWidth;
    const viewHeight = this.viewportEl.clientHeight || window.innerHeight;
    const isMobile = viewWidth <= 860;

    // Safe viewport margins accounting for Top HUD and Bottom QuickNav + Utility Row
    const hudEl = document.querySelector<HTMLElement>('.top-hud-bar');
    const hudRect = hudEl?.getBoundingClientRect();
    const topSafe = hudRect && hudRect.height > 0
      ? Math.min(viewHeight / 2, Math.round(hudRect.bottom + 8))
      : (isMobile ? 54 : 76);

    const navEl = document.getElementById('board-quicknav-bar');
    const navH = navEl && navEl.offsetHeight > 0 ? navEl.offsetHeight : 44;
    const bottomSafe = isMobile ? navH + 54 : navH + 26;

    const sidePad = isMobile ? 8 : 28;
    const availW = Math.max(200, viewWidth - sidePad * 2);
    const availH = Math.max(200, viewHeight - topSafe - bottomSafe);

    const style = window.getComputedStyle(card);
    const cardLeft = card.offsetLeft || parseFloat(style.left) || 1490;
    const cardTop = card.offsetTop || parseFloat(style.top) || 560;
    const cardWidth = card.offsetWidth || parseFloat(style.width) || 360;
    const cardHeight = card.offsetHeight || parseFloat(style.height) || 360;

    let cardCenterX = cardLeft + cardWidth / 2;
    let cardCenterY = cardTop + cardHeight / 2;
    let targetZoom = 1.0;

    if (cardId === 'card-altar-sphere') {
      const unlockCard = this.cards.get('card-unlocks');
      const unlockVisible = unlockCard && unlockCard.style.display !== 'none';
      if (unlockVisible) {
        // Frame both the Sphere and the Unlock Seal button below it
        cardCenterY = cardTop + cardHeight * 0.62;
      }
      targetZoom = isMobile
        ? Math.max(0.82, Math.min(0.98, availW / 340, availH / 410))
        : Math.max(0.85, Math.min(1.0, availH / 540));
    } else {
      const maxDesiredZoom = 1.0;
      const fitW = availW / cardWidth;
      targetZoom = Math.max(this.minZoom, Math.min(maxDesiredZoom, fitW));
      // Frame the top of long cards at readable scale; pan the board to reach the rest.
      cardCenterY = cardTop + Math.min(cardHeight, availH / targetZoom) / 2;
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

  private updateActiveQuickNav(): void {
    if (!this.viewportEl) return;
    const viewWidth = this.viewportEl.clientWidth || window.innerWidth;
    const viewHeight = this.viewportEl.clientHeight || window.innerHeight;

    const currentCenterWorldX = (viewWidth / 2 - this.panX) / this.zoom;
    const currentCenterWorldY = (viewHeight / 2 - this.panY) / this.zoom;

    let closestCardId = 'card-altar-sphere';
    let minDistance = Infinity;

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

    this.quickNavBtns.forEach((btn, targetId) => {
      btn.classList.toggle('active', targetId === closestCardId);
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
