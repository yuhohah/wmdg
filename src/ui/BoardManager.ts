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

  constructor() {
    this.initElements();
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

      // Filter out clicks on interactive buttons, inputs, links, or internal scrollable card bodies
      const target = e.target as HTMLElement;
      const isCardHeader = !!target.closest('.dodeca-card-header');
      const isCardBody = !!target.closest('.dodeca-card-body');
      const isInteractive = !!target.closest('button, a, input, select, textarea, canvas, .cost-val, [role="button"]');

      if (isInteractive && !isCardHeader) {
        return;
      }

      if (isCardBody && e.button !== 1) {
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

      this.viewportEl?.classList.add('is-dragging');
      this.viewportEl?.setPointerCapture(e.pointerId);
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

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        this.hasMoved = true;
      }

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

    // 8. Window Resize
    window.addEventListener('resize', () => {
      this.applyTransform();
    });
  }

  private applyTransform(): void {
    if (!this.worldEl) return;
    this.worldEl.style.transform = `translate3d(${this.panX}px, ${this.panY}px, 0) scale(${this.zoom})`;
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
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

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

    const cardLeft = card.offsetLeft;
    const cardTop = card.offsetTop;
    const cardWidth = card.offsetWidth || 400;
    const cardHeight = card.offsetHeight || 500;

    const cardCenterX = cardLeft + cardWidth / 2;
    const cardCenterY = cardTop + cardHeight / 2;

    const viewWidth = this.viewportEl.clientWidth;
    const viewHeight = this.viewportEl.clientHeight;

    const targetZoom = viewWidth < 768 ? 0.75 : 1.0;

    const targetPanX = viewWidth / 2 - cardCenterX * targetZoom;
    const targetPanY = viewHeight / 2 - cardCenterY * targetZoom;

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
    const duration = 500;
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
    const viewWidth = this.viewportEl.clientWidth;
    const viewHeight = this.viewportEl.clientHeight;

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
